# DevPilot Code-Content Bug Prediction — How It Works

Reference doc explaining the code-content bug prediction system: what each
file does, the algorithms used, and why each design choice was made.

## The big idea

Old system: predicted bug risk from **commit metrics** (how often a file was
changed, by how many people, etc.) — it never looked at the code. Models were
trained on **fake synthetic data**.

New system: predicts risk by **reading the actual source code** and combining
two complementary views:

1. **Semantic view** — CodeBERT (a transformer neural net) reads the code's
   tokens and understands meaning/context.
2. **Structural view** — tree-sitter parses the code into an AST and we
   measure complexity, nesting, risky patterns ("code smells").

Both views are merged into one **hybrid model** that is trained on **real
labeled data** (CodeXGLUE, ~27k real Java functions marked buggy/clean).

## Files

### 1. Dataset files

#### `training/download_dataset.py`
Downloads CodeXGLUE Defect Detection from HuggingFace as 3 parquet files:
`train.parquet` (21.8k), `valid.parquet` (2.7k), `test.parquet` (2.7k).

**Why this dataset:** the standard academic benchmark for bug prediction from
code. Each row is a real Java function with `target = True/False`
(buggy/clean), sourced from the Devign paper. CodeBERT reaches ~62% accuracy
on it — a genuinely hard problem, which is why the hybrid approach matters.

**Why parquet/HuggingFace:** the official GitHub repo only has split indices;
the raw data is on Google Drive (unreliable). HuggingFace hosts a clean mirror
as parquet — smaller and faster.

#### `training/prepare_dataset.py`
Reads the parquet files, renames `func -> code`, converts boolean `target ->
int label` (0=clean, 1=buggy), adds `language=java` and
`split=train/valid/test`, dedupes identical code, drops empty rows, writes
`training_data.csv`.

**Why this exists:** one clean CSV for training and future expansion. It has a
`load_git_history()` hook so a dataset mined from your own repos' git history
(files just *before* a bug-fix commit = buggy, *after* = clean) can be merged
later with zero refactoring — the multi-language extension.

### 2. `app/code_features.py` — AST structural features (tree-sitter)

Parses source into an Abstract Syntax Tree and extracts **20 fixed numeric
features**.

**Algorithm — tree-sitter:** a parser library with a grammar per language.
Supported languages (match CodeBERT): Python, Java, JS/TS, Go, Ruby, PHP.
Only **named AST nodes** are counted (important: in PHP the keyword `return`
is an anonymous child of `return_statement`; in Ruby `return`/`if` are *named*
statements — counting only named nodes keeps all languages consistent).

**The 20 features and why each predicts bugs:**

| Feature | Why it matters |
|---|---|
| `cyclomatic_complexity` (decision points + 1, McCabe) | More independent paths = more ways logic can go wrong |
| `max_depth`, `avg_depth` | Deep nesting is hard to read/test; classic bug source |
| `node_count`, `num_lines` | Size/complexity proxy |
| `num_functions`, `num_classes` | How much logic lives in one file |
| `empty_catch_count` | `except: pass` / empty `catch {}` silently swallows errors — hides bugs until too late |
| `long_function_count` (>50 lines) | Long functions do too much; bug-prone |
| `todo_comment_count` (TODO/FIXME/HACK) | Marks unfinished/incomplete work |
| `try_count`, `return_count`, `call_count`, `binary_operator_count` | Error-prone regions and logic density |
| `string_literal_count`, `numeric_literal_count` | Hard-coded values that often need changing |
| `identifier_unique_ratio` | Unique names / total names — readability proxy |
| `comment_ratio` | Low commenting on complex code = harder to maintain |

These are interpretable "code smells" a human reviewer would also flag, and
cheap to compute (milliseconds per file) — important because they are computed
again at serving time.

### 3. `app/code_embedder.py` — CodeBERT wrapper

Lazy-loads the fine-tuned CodeBERT model and exposes `embed_and_predict(code)`
returning:
- a **768-dim embedding** (pooler vector — a dense summary of the code's meaning)
- a **bug probability** (softmax over 2 logits; probability of class "buggy")

**Algorithm — CodeBERT:** a BERT-style transformer pretrained by Microsoft on
pairs of (code, natural language doc) from GitHub across 6 languages. Used as
`AutoModelForSequenceClassification` with 2 labels.

**Why lazy loading:** torch/transformers (~500MB) only load when the trained
model actually exists on disk. Until the trained model is shared, the API
keeps working via fallback.

### 4. `app/predictor.py` — the decision logic

`predict_code(code_file)` runs a **priority chain** (best model first):

```
1. Hybrid (CodeBERT embedding + AST features -> XGBoost)   <- most accurate
2. CodeBERT alone (semantic bug probability)               <- no AST needed
3. AST rule-based fallback                                 <- no trained model
```

**Hybrid (`_hybrid_predict`):** concatenates `[768-dim embedding] + [20 AST
features]` = 788 features, feeds XGBoost `predict_proba`, takes probability of
"buggy".

**Why hybrid beats either alone:** embedding captures *what the code does*;
AST features capture *how messy/dangerous it is written*. A file doing
something normal but written badly (swallowed exceptions, deep nesting) looks
clean to pure semantics but is flagged by structure — and vice versa.

**Probability -> risk level (`_probability_to_risk`):**

```
p < 0.30  -> LOW,       conf = 0.5 + 2*|p - 0.5|
p < 0.55  -> MEDIUM
p < 0.75  -> HIGH
p >= 0.75 -> CRITICAL
```

Binary 0..1 probability is mapped onto the existing 4-level UI
(LOW/MEDIUM/HIGH/CRITICAL) so the frontend keeps working. Confidence = distance
from the "unsure" 0.5 point.

**Why 4 levels:** the rest of DevPilot (DB, dashboard, seed data) already
expects LOW/MEDIUM/HIGH/CRITICAL — the existing `RiskLevel` enum and
`PredictResponse`/`ModelComparison` schemas are reused.

**`_ast_rule_predict` (fallback):** weighted score from AST features only
(`cyclomatic * 0.30 + decision density * 0.20 + empty catches * 0.15 + long
functions * 0.15 + TODO * 0.10 + size * 0.10`), used **only** when no trained
model exists — the service never crashes, even before training.

### 5. `app/schemas.py` + `main.py` — the API

- New schemas: `CodeFile {file_path, code, language}` and
  `CodePredictBatchRequest {files[]}`. `language` can be `"auto"` (detected
  from the file extension). Old metric schemas untouched.
- New endpoints (require `X-ML-Service-Key`, same as before):
  - `POST /predict/code` — predict one file
  - `POST /predict/code/batch` — up to 50 files, returns
    `{predictions, summary{LOW, MEDIUM, HIGH, CRITICAL}}`
- `/health` now reports `code_models: {codebert, hybrid}` so the model load
  state can be verified after the handoff.
- `/model/reload` reloads everything from disk after the trained model files
  are copied in — no service restart needed.

### 6. `training/train_code_model.py` — the GPU training pipeline

**Step 1 — Fine-tune CodeBERT.** Load `microsoft/codebert-base`, replace the
head with a 2-class classifier, train with:
- lr 2e-5 (standard for transformers), 3 epochs, batch 32, 400-token
  truncation (CodeXGLUE's official setting)
- `fp16` mixed precision on GPU (faster + lower memory)
- `load_best_model_at_end` on weighted F1, saving each epoch checkpoint

**Step 2 — Extract embeddings.** Run every sample through the fine-tuned
model, take the pooler vector (768-dim) — these become tabular features.

**Step 3 — AST features.** Run every sample through `code_features.py`
(cached to `ast_features.npy` so re-runs are instant).

**Step 4 — Train hybrid XGBoost.** `XGBClassifier` (300 trees, depth 6,
lr 0.05, `binary:logistic`) on `[embedding + AST]`.

**Why XGBoost for the hybrid:** tree ensembles handle mixed-scale tabular
features (embeddings + counts) well, train in minutes, need little data to be
robust, and give feature importance (useful for a report). It also matches the
project's existing XGBoost choice.

**Step 5 — Evaluate + compare.** CodeBERT-only and hybrid scored on the
untouched test split (accuracy + weighted F1), saved to `metrics.json`. The
CodeXGLUE split is strict — test data is never seen during training.

### 7. `requirements.txt` / `train-requirements.txt` / `.gitignore`

- **Serving** (`requirements.txt`): transformers + tree-sitter grammars added;
  torch is documented as a separate CPU install (CUDA torch is ~2.5GB and the
  wrong wheel for the 8GB/CPU machine).
- **Training** (`train-requirements.txt`): full GPU stack — torch,
  transformers, datasets, accelerate, xgboost, grammars.
- **`.gitignore`**: `ml-service/models/` (~500MB, too big for GitHub, shared as
  a zip) and regenerable artifacts (`training_data.csv`, `ast_features.npy`).
  The ~22MB dataset is committed so the friend gets it with one pull.

## Handoff flow (models come back as a zip, not git)

Fine-tuned CodeBERT is ~500MB — GitHub rejects files over 100MB. So:

friend trains on GPU -> zip `models/` -> send (Drive) -> extract into
`ml-service/models/` -> call `POST /model/reload` (or restart the service).

No code changes needed. Verified by `GET /health` -> `code_models`.

## Workflow recap (who does what)

| Task | Machine | Command |
|------|---------|---------|
| Download dataset | any (CPU) | `python training/download_dataset.py` |
| Build training CSV | any (CPU) | `python training/prepare_dataset.py` |
| Fine-tune + hybrid train | **GPU (friend)** | `python training/train_code_model.py --epochs 3 --batch-size 32` |
| Share models back | GPU | zip `models/` and send it |
| Serve predictions | CPU (8GB fine) | `uvicorn main:app` |

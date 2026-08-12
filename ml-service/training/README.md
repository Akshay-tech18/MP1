# DevPilot code-content bug prediction - training handoff

This folder trains a model that **reads source code** (instead of using commit
metrics) to predict whether a file is likely buggy. The dataset and all scripts
are in this repo; the training itself needs a **GPU machine**.

## Who does what

| Task | Machine | Command |
|------|---------|---------|
| Download dataset | any (CPU) | `python training/download_dataset.py` |
| Build training CSV | any (CPU) | `python training/prepare_dataset.py` |
| Fine-tune CodeBERT + train hybrid | **GPU** | `python training/train_code_model.py` |
| Share models back | GPU | zip `models/` and send it |
| Serve predictions | CPU (8GB is fine) | see README in repo root / app |

## Friend's setup (GPU)

1. Clone the repo:
   ```bash
   git clone <repo-url>
   cd ml-service
   ```

2. Install training deps:
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows (Linux/macOS: source venv/bin/activate)
   pip install -r training\train-requirements.txt
   ```
   If torch's default wheel doesn't match your CUDA, install torch first:
   ```bash
   pip install torch --index-url https://download.pytorch.org/whl/cu121
   ```

3. Check the dataset is present:
   ```bash
   python training\download_dataset.py   # downloads ~22 MB from HuggingFace
   python training\prepare_dataset.py    # creates training/dataset/training_data.csv
   ```

4. Train (on GPU):
   ```bash
   python training\train_code_model.py --epochs 3 --batch-size 32
   ```
   This fine-tunes `microsoft/codebert-base` (~125M params), builds tree-sitter
   AST features, trains the hybrid XGBoost classifier, and prints a CodeBERT vs
   hybrid comparison on the held-out test set.

5. Verify + share results:
   ```bash
   ls models\                         # codebert_bug\  hybrid_model.pkl  metrics.json
   type models\metrics.json
   ```
   Zip the `models/` folder (~500 MB, too big for git) and send it back.

## Notes

- The dataset is CodeXGLUE Defect Detection (Java, ~27k labeled functions).
  The repo has a merge point (`prepare_dataset.py -> load_git_history`) for a
  future dataset mined from real git history (files before a bug-fix commit are
  labeled buggy, after are clean) so we can cover more languages.
- Default training args match the CodeXGLUE benchmark: 400-token truncation,
  lr 2e-5, 3 epochs. Accuracy on the test set will land around 0.62 for
  CodeBERT; the hybrid model should beat or match it.
- `models/codebert_bug/` must contain `config.json`, `model.safetensors`,
  `tokenizer.json`/`vocab.txt` etc. - the serving service loads the whole folder.

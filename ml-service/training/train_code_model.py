"""
Train the code-content bug predictor (run this on a GPU machine).

Pipeline:
  1. Load training_data.csv (code, label, language, split).
  2. Fine-tune microsoft/codebert-base as a buggy/clean classifier.
  3. Extract semantic embeddings from the fine-tuned model.
  4. Build tree-sitter AST features for every sample.
  5. Train a hybrid XGBoost classifier on [embedding + AST features].
  6. Evaluate CodeBERT-only vs hybrid on the test split, save metrics.json.

Outputs (written to ml-service/models/):
  codebert_bug/     - fine-tuned CodeBERT (model + tokenizer)
  hybrid_model.pkl  - hybrid classifier + feature schema
  metrics.json      - accuracy / F1 comparison

Requirements: training/train-requirements.txt
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import torch
from datasets import Dataset
from sklearn.metrics import accuracy_score, classification_report, f1_score
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)
from xgboost import XGBClassifier

# Allow importing from ml-service/app
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT)

from app.code_features import FEATURE_COLUMNS, extract_features  # noqa: E402
from app.code_embedder import roberta_safe_pooler  # noqa: E402

DATA_PATH = os.path.join(ROOT, "training", "dataset", "training_data.csv")
MODEL_DIR = os.path.join(ROOT, "models")
FINETUNED_DIR = os.path.join(MODEL_DIR, "codebert_bug")
AST_CACHE_PATH = os.path.join(ROOT, "training", "dataset", "ast_features.npy")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
LABELS = [0, 1]


def parse_args():
    p = argparse.ArgumentParser(description="Train the code-content bug predictor.")
    p.add_argument("--model-name", default="microsoft/codebert-base")
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--max-len", type=int, default=400, help="Truncation length (CodeXGLUE uses 400)")
    p.add_argument("--lr", type=float, default=2e-5)
    p.add_argument("--rebuild-ast", action="store_true", help="Recompute AST features instead of loading cache")
    return p.parse_args()


def load_data():
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded dataset: {len(df):,} samples")
    print("Splits:", df["split"].value_counts().to_dict())
    return (
        df[df["split"] == "train"].reset_index(drop=True),
        df[df["split"] == "valid"].reset_index(drop=True),
        df[df["split"] == "test"].reset_index(drop=True),
    )


def make_dataset(df, tokenizer, max_len):
    enc = tokenizer(df["code"].tolist(), truncation=True, padding=True, max_length=max_len)
    return Dataset.from_dict(
        {
            "input_ids": enc["input_ids"],
            "attention_mask": enc["attention_mask"],
            "labels": df["label"].tolist(),
        }
    )


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    return {
        "accuracy": accuracy_score(labels, preds),
        "f1": f1_score(labels, preds, average="weighted"),
    }


def fine_tune(train_df, valid_df, args):
    print("\n=== Step 1: Fine-tuning CodeBERT ===")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForSequenceClassification.from_pretrained(args.model_name, num_labels=2)

    train_ds = make_dataset(train_df, tokenizer, args.max_len)
    valid_ds = make_dataset(valid_df, tokenizer, args.max_len)

    training_args = TrainingArguments(
        output_dir=os.path.join(MODEL_DIR, "codebert_trainer"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        learning_rate=args.lr,
        warmup_steps=200,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=100,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        greater_is_better=True,
        fp16=torch.cuda.is_available(),
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=valid_ds,
        tokenizer=tokenizer,
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
    )

    trainer.train()
    os.makedirs(FINETUNED_DIR, exist_ok=True)
    trainer.save_model(FINETUNED_DIR)
    tokenizer.save_pretrained(FINETUNED_DIR)
    print(f"Saved fine-tuned CodeBERT -> {FINETUNED_DIR}")
    return model, tokenizer


@torch.no_grad()
def extract_embeddings(model, tokenizer, df, batch_size, max_len):
    """Embedding vectors from the fine-tuned model for every sample.

    Uses roberta_safe_pooler (shared with the serving code) so the hybrid
    model's input features are identical at training and inference time.
    """
    model.eval()
    device = model.device
    enc = tokenizer(df["code"].tolist(), truncation=True, padding=True, max_length=max_len)
    embs = []
    n = len(df)
    for start in range(0, n, batch_size):
        end = min(start + batch_size, n)
        inputs = {
            k: torch.tensor(enc[k][start:end], device=device)
            for k in ("input_ids", "attention_mask")
        }
        pooled = roberta_safe_pooler(model, inputs)
        embs.append(pooled.cpu().numpy())
    return np.vstack(embs)


def build_ast_features(df, rebuild=False):
    print("\n=== Step 2: Building AST features (tree-sitter) ===")
    if os.path.exists(AST_CACHE_PATH) and not rebuild:
        feats = np.load(AST_CACHE_PATH)
        if feats.shape[0] == len(df):
            print(f"Loaded cached AST features ({feats.shape[0]:,} samples x {feats.shape[1]} cols)")
            return feats
        print("Cache size mismatch, recomputing.")

    cols = FEATURE_COLUMNS
    rows = []
    languages = df["language"].tolist() if "language" in df.columns else ["python"] * len(df)
    for i, (code, lang) in enumerate(zip(df["code"].tolist(), languages)):
        f = extract_features(code, lang)
        rows.append([f[c] for c in cols])
        if (i + 1) % 5000 == 0:
            print(f"  parsed {i + 1:,}/{len(df):,}")
    feats = np.array(rows, dtype=np.float32)
    np.save(AST_CACHE_PATH, feats)
    print(f"Saved AST features -> {AST_CACHE_PATH} ({feats.shape})")
    return feats


def train_hybrid(train_emb, test_emb, train_ast, test_ast, y_train, y_test):
    print("\n=== Step 3: Training hybrid XGBoost (embedding + AST) ===")
    X_train = np.hstack([train_emb, train_ast])
    X_test = np.hstack([test_emb, test_ast])
    print(f"Hybrid feature matrix: {X_train.shape}")

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        objective="binary:logistic",
        eval_metric="logloss",
        n_jobs=-1,
        random_state=42,
        tree_method="hist",
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average="weighted")

    joblib.dump(
        {
            "model": model,
            "ast_columns": FEATURE_COLUMNS,
            "embedding_size": train_emb.shape[1],
            "feature_order": "embedding + ast (ast in FEATURE_COLUMNS order)",
            "max_len": 400,
        },
        os.path.join(MODEL_DIR, "hybrid_model.pkl"),
    )
    print(f"Hybrid model saved -> {os.path.join(MODEL_DIR, 'hybrid_model.pkl')}")
    return acc, f1


def main():
    args = parse_args()
    os.makedirs(MODEL_DIR, exist_ok=True)

    train_df, valid_df, test_df = load_data()
    print("Device:", "cuda" if torch.cuda.is_available() else "cpu (slow, GPU strongly recommended)")

    # --- 1. Fine-tune
    model, tokenizer = fine_tune(train_df, valid_df, args)

    # --- 2. Embeddings + AST features
    print("\n=== Extracting embeddings from fine-tuned model ===")
    train_emb = extract_embeddings(model, tokenizer, train_df, args.batch_size * 2, args.max_len)
    valid_emb = extract_embeddings(model, tokenizer, valid_df, args.batch_size * 2, args.max_len)
    test_emb = extract_embeddings(model, tokenizer, test_df, args.batch_size * 2, args.max_len)
    print(f"Embedding matrices: train={train_emb.shape} valid={valid_emb.shape} test={test_emb.shape}")

    # AST features (compute on train + test; valid already used for early stopping)
    train_ast = build_ast_features(train_df, rebuild=args.rebuild_ast)
    test_ast = build_ast_features(test_df, rebuild=args.rebuild_ast)

    # --- 3. Hybrid model
    y_train = train_df["label"].to_numpy()
    y_test = test_df["label"].to_numpy()
    hybrid_acc, hybrid_f1 = train_hybrid(
        train_emb, test_emb, train_ast, test_ast, y_train, y_test
    )

    # --- 4. CodeBERT-only evaluation on test
    print("\n=== Step 4: CodeBERT-only test evaluation ===")
    device = model.device
    model.eval()
    all_preds, all_probs, all_labels = [], [], []
    n = len(test_df)
    for start in range(0, n, args.batch_size * 2):
        end = min(start + args.batch_size * 2, n)
        enc = tokenizer(
            test_df["code"].tolist()[start:end],
            truncation=True,
            padding=True,
            max_length=args.max_len,
        )
        inputs = {
            k: torch.tensor(v, device=device)
            for k, v in enc.items()
            if k in ("input_ids", "attention_mask")
        }
        with torch.no_grad():
            logits = model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()
        all_preds.extend(np.argmax(probs, axis=-1).tolist())
        all_probs.extend(probs[:, 1].tolist())
        all_labels.extend(test_df["label"].tolist()[start:end])

    cb_acc = accuracy_score(all_labels, all_preds)
    cb_f1 = f1_score(all_labels, all_preds, average="weighted")
    print("\nCodeBERT classification report (test):")
    print(classification_report(all_labels, all_preds, target_names=["clean", "buggy"]))

    # --- 5. Save metrics
    metrics = {
        "codebert": {"accuracy": round(float(cb_acc), 4), "weighted_f1": round(float(cb_f1), 4)},
        "hybrid": {"accuracy": round(float(hybrid_acc), 4), "weighted_f1": round(float(hybrid_f1), 4)},
        "test_size": int(n),
        "model_dir": FINETUNED_DIR,
        "note": "primary = hybrid if it wins on F1, else CodeBERT",
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print("\n=== Final comparison ===")
    print(f"  CodeBERT accuracy: {cb_acc:.4f}  weighted-F1: {cb_f1:.4f}")
    print(f"  Hybrid    accuracy: {hybrid_acc:.4f}  weighted-F1: {hybrid_f1:.4f}")
    print(f"\nMetrics saved -> {METRICS_PATH}")
    print("Training complete. Zip the models/ folder and share it.")


if __name__ == "__main__":
    main()

"""
Builds the unified training CSV used by train_code_model.py.

Input : training/dataset/codexglue/*.parquet  (from download_dataset.py)
         plus any optional git-history CSV named git_history_dataset.csv
         in the same dataset folder (same columns: code, label, language).
Output: training/dataset/training_data.csv  with columns:
           code      - raw source text
           label     - 1 = buggy, 0 = clean
           language  - lowercase language name
           split     - train | valid | test

Runs on CPU. Requires pandas.
"""

import os

import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
CODEXGLUE_DIR = os.path.join(DATASET_DIR, "codexglue")
OUT_PATH = os.path.join(DATASET_DIR, "training_data.csv")

CODEXGLUE_LANGUAGE = "java"


def load_codexglue() -> pd.DataFrame:
    parts = []
    for split, parquet_name in [
        ("train", "train.parquet"),
        ("valid", "valid.parquet"),
        ("test", "test.parquet"),
    ]:
        path = os.path.join(CODEXGLUE_DIR, parquet_name)
        if not os.path.exists(path):
            print(f"[skip] missing {path} - run download_dataset.py first")
            continue

        df = pd.read_parquet(path)
        df = df.rename(columns={"func": "code"})
        df["label"] = df["target"].astype(int)
        df["language"] = CODEXGLUE_LANGUAGE
        df["split"] = split
        parts.append(df[["code", "label", "language", "split"]])

    if not parts:
        return pd.DataFrame()
    return pd.concat(parts, ignore_index=True)


def load_git_history() -> pd.DataFrame:
    """Optional dataset mined from real git history (built later by build_dataset.py)."""
    path = os.path.join(DATASET_DIR, "git_history_dataset.csv")
    if not os.path.exists(path):
        print("[skip] no git_history_dataset.csv found - not merging custom data")
        return pd.DataFrame()

    df = pd.read_csv(path)
    df["language"] = df["language"].astype(str).str.lower()
    df["split"] = df.get("split", "train") if "split" in df.columns else "train"
    print(f"[merge] loaded git-history dataset: {len(df):,} samples")
    return df


def main():
    print("=== Prepare training dataset ===")

    parts = []
    cxg = load_codexglue()
    if not cxg.empty:
        print(f"CodeXGLUE samples: {len(cxg):,}")
        parts.append(cxg)

    gh = load_git_history()
    if not gh.empty:
        parts.append(gh)

    if not parts:
        print("No data found. Run `python training/download_dataset.py` first.")
        return

    df = pd.concat(parts, ignore_index=True)

    # Dedupe on identical code (keep first occurrence)
    before = len(df)
    df = df.drop_duplicates(subset=["code"], keep="first").reset_index(drop=True)
    print(f"Deduplicated identical code: {before:,} -> {len(df):,}")

    # Drop empty / whitespace-only samples
    df = df[df["code"].str.strip().astype(bool)].reset_index(drop=True)

    df.to_csv(OUT_PATH, index=False)

    print(f"\nSaved unified dataset to {OUT_PATH}")
    print(f"Total samples: {len(df):,}")
    print("\nLabel distribution:")
    print(df["label"].value_counts().rename(index={0: "clean", 1: "buggy"}).to_string())
    print("\nLanguage distribution:")
    print(df["language"].value_counts().to_string())
    print("\nSplit distribution:")
    print(df["split"].value_counts().to_string())
    print("\nAverage code length: {:.0f} chars".format(df["code"].str.len().mean()))


if __name__ == "__main__":
    main()

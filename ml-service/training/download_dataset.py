"""
Downloads the CodeXGLUE Defect Detection dataset (Java) used to train the
code-content bug predictor.

Source: HuggingFace mirror of https://github.com/microsoft/CodeXGLUE/tree/main/Code-Code/Defect-detection
Files (parquet, no preprocessing needed):
  - train-00000-of-00001.parquet  (~21.8k functions)
  - validation-00000-of-00001.parquet (~2.7k functions)
  - test-00000-of-00001.parquet   (~2.7k functions)

Columns: id, func (source code), target (bool: True = buggy, False = clean),
         project, commit_id.

Runs on CPU. Requires `requests` and `pyarrow`.
"""

import os
import sys

import requests

# Directory where the parquet files are saved
DATASET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset", "codexglue")
os.makedirs(DATASET_DIR, exist_ok=True)

BASE_URL = "https://huggingface.co/datasets/code_x_glue_cc_defect_detection/resolve/main/data"
FILES = {
    "train": "train-00000-of-00001.parquet",
    "valid": "validation-00000-of-00001.parquet",
    "test": "test-00000-of-00001.parquet",
}


def download_split(split: str) -> str:
    dest = os.path.join(DATASET_DIR, f"{split}.parquet")

    if os.path.exists(dest):
        print(f"[skip] {split}.parquet already exists -> {dest}")
        return dest

    url = f"{BASE_URL}/{FILES[split]}"
    print(f"[downloading] {url}")
    resp = requests.get(url, timeout=300)
    resp.raise_for_status()

    with open(dest, "wb") as f:
        f.write(resp.content)

    print(f"[saved] {split}.parquet -> {dest} ({len(resp.content)/1e6:.1f} MB)")
    return dest


def inspect_split(path: str):
    import pandas as pd

    df = pd.read_parquet(path)
    n_buggy = int(df["target"].astype(int).sum())
    print(
        f"  {os.path.basename(path)}: {len(df):,} samples | "
        f"buggy={n_buggy:,} ({n_buggy/len(df)*100:.1f}%) | "
        f"avg func len={df['func'].str.len().mean():.0f} chars"
    )


def main():
    print("=== Download CodeXGLUE Defect Detection dataset ===")

    if all(os.path.exists(os.path.join(DATASET_DIR, f"{s}.parquet")) for s in FILES):
        print("All split files already present. Skipping download entirely.")
    else:
        for split in FILES:
            try:
                download_split(split)
            except requests.RequestException as e:
                print(f"  ERROR downloading {split}: {e}")
                print("  Check your internet connection and try again.")
                sys.exit(1)

    print("\n=== Dataset inspection ===")
    for split in FILES:
        inspect_split(os.path.join(DATASET_DIR, f"{split}.parquet"))

    print("\nDone. Run `python training/prepare_dataset.py` to build the training CSV.")


if __name__ == "__main__":
    main()

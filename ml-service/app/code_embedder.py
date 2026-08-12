"""
Lazy-loaded wrapper around the fine-tuned CodeBERT model used for semantic
code understanding.

The model is only loaded when first needed (torch + transformers are imported
lazily), so the API keeps working with a rule-based fallback before the trained
model exists on disk. Model files are expected at:
    models/codebert_bug/          <- fine-tuned CodeBERT (from train_code_model.py)
"""

import os
from typing import Optional, Tuple

import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
FINETUNED_MODEL_PATH = os.path.join(MODEL_DIR, "codebert_bug")

MAX_SEQ_LEN = 512


class CodeEmbedder:
    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._device = None
        self._error = None

    @property
    def available(self) -> bool:
        return self._model is not None

    @property
    def error(self) -> Optional[str]:
        return self._error

    def reset(self):
        """Forget any cached model/error so a later reload can succeed."""
        self._model = None
        self._tokenizer = None
        self._device = None
        self._error = None

    def ensure_loaded(self):
        """Loads the model once; any failure is recorded so we don't retry every request."""
        if self._model is not None or self._error is not None:
            return

        try:
            import torch
            from transformers import AutoModelForSequenceClassification, AutoTokenizer

            if not os.path.isdir(FINETUNED_MODEL_PATH):
                raise FileNotFoundError(
                    f"Fine-tuned CodeBERT not found at {FINETUNED_MODEL_PATH}. "
                    "Train it first (training/train_code_model.py) or wait for the model to be shared."
                )

            self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self._model = AutoModelForSequenceClassification.from_pretrained(FINETUNED_MODEL_PATH)
            self._model.to(self._device)
            self._model.eval()
            self._tokenizer = AutoTokenizer.from_pretrained(FINETUNED_MODEL_PATH)
            print(f"[CodeEmbedder] fine-tuned CodeBERT loaded on {self._device}")
        except Exception as e:
            self._error = str(e)
            print(f"[CodeEmbedder] unavailable: {e}")

    def embed_and_predict(self, code: str) -> Tuple[Optional[np.ndarray], Optional[float]]:
        """
        Returns (embedding, bug_probability).
        embedding: 768-dim pooler vector from CodeBERT (for the hybrid model).
        bug_prob:   probability the code is buggy (1.0 = buggy).
        Both are None if the model is not available.
        """
        self.ensure_loaded()
        if not self.available:
            return None, None

        import torch

        inputs = self._tokenizer(
            code,
            truncation=True,
            max_length=MAX_SEQ_LEN,
            padding="max_length",
            return_tensors="pt",
        )
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with torch.inference_mode():
            base_out = self._model.base_model(**inputs)
            pooled = base_out.pooler_output  # [1, 768]
            logits = self._model(**inputs).logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

        embedding = pooled[0].cpu().numpy()
        bug_prob = float(probs[1]) if probs.shape[0] > 1 else float(probs[0])
        return embedding, bug_prob

import numpy as np
import pandas as pd
from typing import Tuple

def generate_synthetic_data(num_samples: int = 1000) -> pd.DataFrame:
    """
    Generates a synthetic dataset with realistic distributions for software defect prediction.
    Features:
      - commit_frequency (float): commits/week, typical range [0.1, 15.0]
      - code_churn (float): total lines added/deleted, typical range [10, 10000]
      - num_contributors (int): unique authors, typical range [1, 10]
      - pr_count (int): number of PRs touching file, typical range [0, 20]
      - bug_fix_ratio (float): proportion of commits fixing bugs, typical range [0.0, 1.0]
    
    Target:
      - risk_level (str): "LOW", "MEDIUM", "HIGH", "CRITICAL"
    """
    np.random.seed(42)
    
    # Generate feature distributions
    commit_frequency = np.random.exponential(scale=3.0, size=num_samples) + 0.1
    # code churn is related to commit frequency
    code_churn = commit_frequency * np.random.lognormal(mean=5.0, sigma=1.0, size=num_samples) + 10
    num_contributors = np.random.poisson(lam=2.0, size=num_samples) + 1
    # pr_count is related to commit_frequency
    pr_count = np.random.poisson(lam=commit_frequency * 0.8, size=num_samples)
    bug_fix_ratio = np.random.beta(a=1, b=3, size=num_samples)
    
    # Let's generate risk levels based on feature scores
    # We will score files and categorize them
    f_freq = np.clip(commit_frequency / 12.0, 0, 1)
    f_churn = np.clip(code_churn / 6000.0, 0, 1)
    f_contrib = np.clip(num_contributors / 6.0, 0, 1)
    f_pr = np.clip(pr_count / 12.0, 0, 1)
    f_bug = bug_fix_ratio
    
    # Score formula
    score = (f_freq * 0.25) + (f_churn * 0.2) + (f_contrib * 0.15) + (f_pr * 0.1) + (f_bug * 0.3)
    
    # Map score to risk classes: 0=LOW, 1=MEDIUM, 2=HIGH, 3=CRITICAL
    risk_level_nums = []
    for s in score:
        if s < 0.25:
            risk_level_nums.append(0)  # LOW
        elif s < 0.55:
            risk_level_nums.append(1)  # MEDIUM
        elif s < 0.8:
            risk_level_nums.append(2)  # HIGH
        else:
            risk_level_nums.append(3)  # CRITICAL
            
    df = pd.DataFrame({
        "commit_frequency": commit_frequency,
        "code_churn": code_churn,
        "num_contributors": num_contributors,
        "pr_count": pr_count,
        "bug_fix_ratio": bug_fix_ratio,
        "risk_level": risk_level_nums
    })
    
    return df

def preprocess_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Splits features and target.
    """
    feature_cols = ["commit_frequency", "code_churn", "num_contributors", "pr_count", "bug_fix_ratio"]
    X = df[feature_cols]
    y = df["risk_level"] if "risk_level" in df.columns else None
    return X, y

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
    
    # Generate balanced file profiles across 4 defect risk tiers:
    # 40% LOW, 35% MEDIUM, 15% HIGH, 10% CRITICAL
    n_low = int(num_samples * 0.40)
    n_med = int(num_samples * 0.35)
    n_high = int(num_samples * 0.15)
    n_crit = num_samples - (n_low + n_med + n_high)

    # 1. LOW: Stable files, rare commits, few authors, low bug-fix ratio
    cf_low = np.random.uniform(0.1, 2.5, n_low)
    cc_low = cf_low * np.random.uniform(20, 150, n_low) + np.random.uniform(10, 200, n_low)
    nc_low = np.random.choice([1, 2], size=n_low, p=[0.75, 0.25])
    pr_low = np.random.poisson(lam=0.8, size=n_low)
    bf_low = np.random.beta(1.0, 8.0, size=n_low)  # mean ~ 0.11

    # 2. MEDIUM: Moderately active features, standard churn and bug-fix activity
    cf_med = np.random.uniform(2.0, 6.0, n_med)
    cc_med = cf_med * np.random.uniform(100, 350, n_med) + np.random.uniform(100, 500, n_med)
    nc_med = np.random.choice([2, 3, 4], size=n_med, p=[0.4, 0.4, 0.2])
    pr_med = np.random.poisson(lam=3.0, size=n_med)
    bf_med = np.random.beta(2.5, 5.0, size=n_med)  # mean ~ 0.33

    # 3. HIGH: Fast-moving hotspot modules with elevated churn & multiple developers
    cf_high = np.random.uniform(5.5, 12.0, n_high)
    cc_high = cf_high * np.random.uniform(250, 600, n_high) + np.random.uniform(400, 1200, n_high)
    nc_high = np.random.choice([3, 4, 5, 6], size=n_high, p=[0.2, 0.4, 0.3, 0.1])
    pr_high = np.random.poisson(lam=7.0, size=n_high)
    bf_high = np.random.beta(5.0, 4.0, size=n_high)  # mean ~ 0.55

    # 4. CRITICAL: High-churn, error-prone modules with frequent bug fix patches
    cf_crit = np.random.uniform(8.0, 18.0, n_crit)
    cc_crit = cf_crit * np.random.uniform(400, 900, n_crit) + np.random.uniform(800, 2500, n_crit)
    nc_crit = np.random.choice([4, 5, 6, 7, 8], size=n_crit, p=[0.1, 0.3, 0.3, 0.2, 0.1])
    pr_crit = np.random.poisson(lam=12.0, size=n_crit)
    bf_crit = np.random.beta(7.0, 2.5, size=n_crit)  # mean ~ 0.74

    # Concatenate features
    commit_frequency = np.round(np.concatenate([cf_low, cf_med, cf_high, cf_crit]), 2)
    code_churn = np.round(np.concatenate([cc_low, cc_med, cc_high, cc_crit]), 1)
    num_contributors = np.concatenate([nc_low, nc_med, nc_high, nc_crit])
    pr_count = np.concatenate([pr_low, pr_med, pr_high, pr_crit])
    bug_fix_ratio = np.round(np.clip(np.concatenate([bf_low, bf_med, bf_high, bf_crit]), 0.0, 1.0), 3)

    # Risk level target: 0: LOW, 1: MEDIUM, 2: HIGH, 3: CRITICAL
    risk_level_nums = np.concatenate([
        np.zeros(n_low, dtype=int),
        np.ones(n_med, dtype=int),
        np.full(n_high, 2, dtype=int),
        np.full(n_crit, 3, dtype=int)
    ])

    # Shuffle the dataset
    indices = np.arange(num_samples)
    np.random.shuffle(indices)

    df = pd.DataFrame({
        "commit_frequency": commit_frequency[indices],
        "code_churn": code_churn[indices],
        "num_contributors": num_contributors[indices],
        "pr_count": pr_count[indices],
        "bug_fix_ratio": bug_fix_ratio[indices],
        "risk_level": risk_level_nums[indices]
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

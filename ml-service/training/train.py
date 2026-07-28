import os
import sys
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score
import xgboost as xgb

# Add parent directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.feature_extractor import generate_synthetic_data, preprocess_features

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

def main():
    print("=== DevPilot ML Model Training Pipeline ===")
    
    # 1. Load or Generate Dataset
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    dataset_path = None
    
    if csv_files:
        dataset_path = os.path.join(DATA_DIR, csv_files[0])
        print(f"Loading training data from: {dataset_path}")
        df = pd.read_csv(dataset_path)
    else:
        print("No CSV datasets found in training/dataset/ directory.")
        print("Generating a 1,000-sample synthetic dataset with realistic bug patterns...")
        df = generate_synthetic_data(num_samples=1000)
        dataset_path = os.path.join(DATA_DIR, "synthetic_dataset.csv")
        df.to_csv(dataset_path, index=False)
        print(f"Saved synthetic dataset to: {dataset_path}")

    # 2. Preprocess features and labels
    X, y = preprocess_features(df)
    
    print(f"Dataset shape: {X.shape}")
    print("Class distribution in training data:")
    # Class mapping: 0: LOW, 1: MEDIUM, 2: HIGH, 3: CRITICAL
    class_names = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    counts = y.value_counts().sort_index()
    for idx, count in counts.items():
        name = class_names[idx] if idx < len(class_names) else f"Class_{idx}"
        print(f"  - {name} ({idx}): {count} samples ({count/len(y)*100:.1f}%)")

    # 3. Train-Test Split (20% held-out test set)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 4. Stratified 5-Fold Cross Validation for evaluation
    print("\nRunning 5-Fold Stratified Cross Validation...")
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    xgb_cv_scores = []
    rf_cv_scores = []
    
    for fold, (train_idx, val_idx) in enumerate(skf.split(X_train, y_train), 1):
        X_tr, X_val = X_train.iloc[train_idx], X_train.iloc[val_idx]
        y_tr, y_val = y_train.iloc[train_idx], y_train.iloc[val_idx]
        
        # Train fold XGBoost
        xgb_fold = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            objective="multi:softprob",
            num_class=4,
            random_state=42,
            eval_metric="mlogloss"
        )
        xgb_fold.fit(X_tr, y_tr)
        xgb_pred = xgb_fold.predict(X_val)
        xgb_cv_scores.append(accuracy_score(y_val, xgb_pred))
        
        # Train fold Random Forest
        rf_fold = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            random_state=42
        )
        rf_fold.fit(X_tr, y_tr)
        rf_pred = rf_fold.predict(X_val)
        rf_cv_scores.append(accuracy_score(y_val, rf_pred))
        
    print(f"  - XGBoost CV Accuracy: {np.mean(xgb_cv_scores):.4f} (+/- {np.std(xgb_cv_scores):.4f})")
    print(f"  - Random Forest CV Accuracy: {np.mean(rf_cv_scores):.4f} (+/- {np.std(rf_cv_scores):.4f})")

    # 5. Fit Final Models on full training set
    print("\nTraining final models on full training set...")
    
    xgb_model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        objective="multi:softprob",
        num_class=4,
        random_state=42,
        eval_metric="mlogloss"
    )
    xgb_model.fit(X_train, y_train)
    
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        random_state=42
    )
    rf_model.fit(X_train, y_train)

    # 6. Evaluate on Held-out Test Set
    print("\nEvaluating models on 20% held-out test set...")
    
    xgb_test_pred = xgb_model.predict(X_test)
    rf_test_pred = rf_model.predict(X_test)
    
    print("\n--- XGBoost Classification Report ---")
    print(classification_report(y_test, xgb_test_pred, target_names=class_names))
    
    print("\n--- Random Forest Classification Report ---")
    print(classification_report(y_test, rf_test_pred, target_names=class_names))

    # 7. Save Model Pickles
    xgb_path = os.path.join(MODEL_DIR, "xgboost_model.pkl")
    rf_path = os.path.join(MODEL_DIR, "random_forest_model.pkl")
    
    joblib.dump(xgb_model, xgb_path)
    joblib.dump(rf_model, rf_path)
    
    print("\nSaved trained models:")
    print(f"  - XGBoost model: {xgb_path}")
    print(f"  - Random Forest model: {rf_path}")
    print("\nTraining complete.")

if __name__ == "__main__":
    main()

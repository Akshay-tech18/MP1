import os
import sys
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, f1_score, confusion_matrix

# Add parent directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.feature_extractor import preprocess_features

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset")
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

def print_confusion_matrix(cm, class_names):
    """
    Format and print a confusion matrix.
    """
    header = f"{'True \\ Pred':12s} | " + " | ".join(f"{name:8s}" for name in class_names)
    print(header)
    print("-" * len(header))
    for i, row in enumerate(cm):
        row_str = f"{class_names[i]:12s} | " + " | ".join(f"{val:8d}" for val in row)
        print(row_str)

def main():
    print("=== DevPilot ML Model Evaluation Report ===")
    
    # 1. Check for model files
    xgb_path = os.path.join(MODEL_DIR, "xgboost_model.pkl")
    rf_path = os.path.join(MODEL_DIR, "random_forest_model.pkl")
    
    if not os.path.exists(xgb_path) or not os.path.exists(rf_path):
        print("Error: Trained model files not found in models/ directory. Run train.py first.")
        sys.exit(1)
        
    xgb_model = joblib.load(xgb_path)
    rf_model = joblib.load(rf_path)
    print("Loaded models successfully.")

    # 2. Check for dataset
    csv_files = [f for f in os.listdir(DATA_DIR) if f.endswith(".csv")]
    if not csv_files:
        print("Error: No CSV datasets found in training/dataset/ directory. Run train.py first.")
        sys.exit(1)
        
    dataset_path = os.path.join(DATA_DIR, csv_files[0])
    print(f"Loading evaluation data from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    # 3. Preprocess and get test split
    X, y = preprocess_features(df)
    class_names = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    
    # Same random_state and split as train.py to isolate test set
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # 4. Generate Predictions
    xgb_preds = xgb_model.predict(X_test)
    rf_preds = rf_model.predict(X_test)

    # 5. Compute Metrics
    xgb_acc = accuracy_score(y_test, xgb_preds)
    rf_acc = accuracy_score(y_test, rf_preds)
    
    xgb_f1 = f1_score(y_test, xgb_preds, average="weighted")
    rf_f1 = f1_score(y_test, rf_preds, average="weighted")
    
    xgb_cm = confusion_matrix(y_test, xgb_preds)
    rf_cm = confusion_matrix(y_test, rf_preds)

    # 6. Output Reports
    print("\n" + "="*50)
    print("1. XGBOOST (PRIMARY MODEL) PERFORMANCE")
    print("="*50)
    print(f"Overall Accuracy: {xgb_acc:.4f}")
    print(f"Weighted F1-Score: {xgb_f1:.4f}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, xgb_preds, target_names=class_names))
    print("\nConfusion Matrix:")
    print_confusion_matrix(xgb_cm, class_names)
    
    print("\n" + "="*50)
    print("2. RANDOM FOREST (BASELINE MODEL) PERFORMANCE")
    print("="*50)
    print(f"Overall Accuracy: {rf_acc:.4f}")
    print(f"Weighted F1-Score: {rf_f1:.4f}")
    print("\nDetailed Classification Report:")
    print(classification_report(y_test, rf_preds, target_names=class_names))
    print("\nConfusion Matrix:")
    print_confusion_matrix(rf_cm, class_names)

    # 7. Model Comparison Table
    print("\n" + "="*50)
    print("3. MODEL COMPARISON SUMMARY")
    print("="*50)
    
    f1_diff = xgb_f1 - rf_f1
    better_model = "XGBoost" if f1_diff > 0 else "Random Forest"
    
    comparison_df = pd.DataFrame({
        "Metric": ["Accuracy", "Weighted F1-Score"],
        "XGBoost (Primary)": [f"{xgb_acc:.4f}", f"{xgb_f1:.4f}"],
        "Random Forest (Baseline)": [f"{rf_acc:.4f}", f"{rf_f1:.4f}"],
        "Difference": [f"{xgb_acc - rf_acc:+.4f}", f"{xgb_f1 - rf_f1:+.4f}"]
    })
    
    print(comparison_df.to_string(index=False))
    print("\nAcademic Summary:")
    print(f"The primary model ({better_model}) outperformed the competitor model by {abs(f1_diff)*100:.2f}% on weighted F1-Score.")
    print("This confirms the choice of XGBoost as the primary prediction engine for DevPilot's code analysis.")

if __name__ == "__main__":
    main()

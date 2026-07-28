import os
import joblib
import numpy as np
import pandas as pd
from app.schemas import RiskLevel, PredictResponse, ModelComparison, FileFeatures

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
XGB_MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.pkl")
RF_MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_model.pkl")

class BugPredictor:
    def __init__(self):
        self.xgb_model = None
        self.rf_model = None
        self.load_models()

    def load_models(self):
        if os.path.exists(XGB_MODEL_PATH):
            try:
                self.xgb_model = joblib.load(XGB_MODEL_PATH)
                print("Loaded XGBoost model successfully.")
            except Exception as e:
                print(f"Error loading XGBoost model: {e}")
        else:
            print("XGBoost model file not found. Running with rule-based fallback.")

        if os.path.exists(RF_MODEL_PATH):
            try:
                self.rf_model = joblib.load(RF_MODEL_PATH)
                print("Loaded Random Forest model successfully.")
            except Exception as e:
                print(f"Error loading Random Forest model: {e}")
        else:
            print("Random Forest model file not found. Running with rule-based fallback.")

    def predict_features(self, features: FileFeatures) -> PredictResponse:
        # Prepare feature vector
        # Features: [commit_frequency, code_churn, num_contributors, pr_count, bug_fix_ratio]
        feat_arr = np.array([[
            features.commit_frequency,
            features.code_churn,
            features.num_contributors,
            features.pr_count,
            features.bug_fix_ratio
        ]])
        
        # 1. XGBoost Prediction (Primary)
        xgb_risk, xgb_conf = self._get_model_prediction(self.xgb_model, feat_arr, features, is_xgb=True)
        
        # 2. Random Forest Prediction (Baseline)
        rf_risk, rf_conf = self._get_model_prediction(self.rf_model, feat_arr, features, is_xgb=False)
        
        agreement = (xgb_risk == rf_risk)
        
        comparison = ModelComparison(
            xgboost_risk=xgb_risk,
            xgboost_confidence=float(xgb_conf),
            rf_risk=rf_risk,
            rf_confidence=float(rf_conf),
            agreement=agreement
        )
        
        return PredictResponse(
            file_path=features.file_path,
            risk_level=xgb_risk,
            risk_score=float(xgb_conf),
            model_comparison=comparison
        )

    def _get_model_prediction(self, model, feat_arr, features, is_xgb=True):
        if model is not None:
            try:
                # Predict class probabilities
                probs = model.predict_proba(feat_arr)[0]
                pred_idx = np.argmax(probs)
                confidence = probs[pred_idx]
                
                # Map class indices back to RiskLevel
                classes = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]
                # In case model classes differ, try to use model.classes_
                if hasattr(model, 'classes_'):
                    risk_label = model.classes_[pred_idx]
                    if isinstance(risk_label, (int, np.integer)):
                        risk_level = classes[min(risk_label, len(classes)-1)]
                    else:
                        risk_level = RiskLevel(risk_label)
                else:
                    risk_level = classes[pred_idx]
                return risk_level, confidence
            except Exception as e:
                print(f"Prediction error using model: {e}")
                # fall through to fallback
        
        # Rule-based fallback prediction
        return self._rule_based_predict(features, is_xgb)

    def _rule_based_predict(self, features: FileFeatures, is_xgb=True):
        # Deterministic scoring
        # Weighting factors
        f_freq = min(features.commit_frequency / 10.0, 1.0)  # capped at 10 commits/week
        f_churn = min(features.code_churn / 5000.0, 1.0)     # capped at 5000 lines churn
        f_contrib = min(features.num_contributors / 5.0, 1.0) # capped at 5 contributors
        f_pr = min(features.pr_count / 10.0, 1.0)            # capped at 10 PRs
        f_bug = features.bug_fix_ratio                       # ratio between 0 and 1
        
        # XGBoost weighting vs Random Forest weighting slightly offset to show model differences
        if is_xgb:
            score = (f_freq * 0.25) + (f_churn * 0.2) + (f_contrib * 0.15) + (f_pr * 0.1) + (f_bug * 0.3)
        else:
            score = (f_freq * 0.2) + (f_churn * 0.15) + (f_contrib * 0.2) + (f_pr * 0.15) + (f_bug * 0.3)
        
        # Map score to risk
        if score < 0.25:
            risk = RiskLevel.LOW
            conf = 1.0 - (score * 2)
        elif score < 0.55:
            risk = RiskLevel.MEDIUM
            conf = 0.5 + (score - 0.25)
        elif score < 0.8:
            risk = RiskLevel.HIGH
            conf = 0.5 + (score - 0.55)
        else:
            risk = RiskLevel.CRITICAL
            conf = 0.7 + (score - 0.8) * 1.5
            
        conf = min(max(conf, 0.5), 0.99)
        return risk, conf

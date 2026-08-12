import os
import joblib
import numpy as np
import pandas as pd
from app.schemas import RiskLevel, PredictResponse, ModelComparison, FileFeatures, CodeFile
from app.code_features import extract_features, detect_language, FEATURE_COLUMNS
from app.code_embedder import CodeEmbedder

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
XGB_MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.pkl")
RF_MODEL_PATH = os.path.join(MODEL_DIR, "random_forest_model.pkl")
HYBRID_MODEL_PATH = os.path.join(MODEL_DIR, "hybrid_model.pkl")

class BugPredictor:
    def __init__(self):
        self.xgb_model = None
        self.rf_model = None
        self.hybrid_model = None
        self.embedder = CodeEmbedder()
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

        if os.path.exists(HYBRID_MODEL_PATH):
            try:
                self.hybrid_model = joblib.load(HYBRID_MODEL_PATH)
                print("Loaded hybrid (CodeBERT + AST) model successfully.")
            except Exception as e:
                print(f"Error loading hybrid model: {e}")
        else:
            print("Hybrid model not found. Code predictions will use CodeBERT or rule-based fallback.")

    def reload_code_models(self):
        """Reload CodeBERT + hybrid after new model files are copied in (post-training)."""
        self.embedder.reset()
        self.embedder.ensure_loaded()
        if os.path.exists(HYBRID_MODEL_PATH):
            try:
                self.hybrid_model = joblib.load(HYBRID_MODEL_PATH)
                print("Loaded hybrid (CodeBERT + AST) model successfully.")
            except Exception as e:
                print(f"Error loading hybrid model: {e}")
        return {
            "codebert": self.embedder.available,
            "hybrid": self.hybrid_model is not None
        }

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

    # ------------------------------------------------------------------ code prediction

    def predict_code(self, code_file: CodeFile) -> PredictResponse:
        """
        Predict defect risk by reading the actual source code:
          1. CodeBERT semantic embedding + bug probability
          2. Hybrid model (embedding + AST features) when available
          3. AST-based rule fallback when no model is loaded
        """
        language = detect_language(code_file.file_path, code_file.language)
        ast_feats = extract_features(code_file.code, language)

        embedding, bug_prob = self.embedder.embed_and_predict(code_file.code)

        semantic_risk = semantic_conf = None
        if bug_prob is not None:
            semantic_risk, semantic_conf = self._probability_to_risk(bug_prob)

        hybrid_risk = hybrid_conf = None
        if embedding is not None:
            hybrid_risk, hybrid_conf = self._hybrid_predict(embedding, ast_feats)

        # Primary risk: hybrid beats semantic beats AST-rule fallback
        if hybrid_risk is not None:
            primary_risk, primary_conf = hybrid_risk, hybrid_conf
        elif semantic_risk is not None:
            primary_risk, primary_conf = semantic_risk, semantic_conf
        else:
            primary_risk, primary_conf = self._ast_rule_predict(ast_feats)

        xgb_side_risk = semantic_risk if semantic_risk is not None else primary_risk
        xgb_side_conf = semantic_conf if semantic_conf is not None else primary_conf
        rf_side_risk = hybrid_risk if hybrid_risk is not None else primary_risk
        rf_side_conf = hybrid_conf if hybrid_conf is not None else primary_conf

        comparison = ModelComparison(
            xgboost_risk=xgb_side_risk,
            xgboost_confidence=float(xgb_side_conf),
            rf_risk=rf_side_risk,
            rf_confidence=float(rf_side_conf),
            agreement=(xgb_side_risk == rf_side_risk)
        )

        return PredictResponse(
            file_path=code_file.file_path,
            risk_level=primary_risk,
            risk_score=float(primary_conf),
            model_comparison=comparison
        )

    def _probability_to_risk(self, prob):
        """Map a bug probability (0..1) to a risk level + confidence."""
        if prob < 0.30:
            risk = RiskLevel.LOW
        elif prob < 0.55:
            risk = RiskLevel.MEDIUM
        elif prob < 0.75:
            risk = RiskLevel.HIGH
        else:
            risk = RiskLevel.CRITICAL
        conf = round(min(0.5 + abs(prob - 0.5) * 2.0, 0.99), 3)
        return risk, conf

    def _hybrid_predict(self, embedding, ast_feats):
        """Hybrid model: [CodeBERT embedding (768) + AST features (20)] -> bug probability."""
        if self.hybrid_model is None:
            return None, None
        try:
            cfg = self.hybrid_model
            model = cfg["model"] if isinstance(cfg, dict) else cfg
            ast_vector = np.array([ast_feats[col] for col in FEATURE_COLUMNS])
            x = np.concatenate([embedding, ast_vector]).reshape(1, -1)
            probs = model.predict_proba(x)[0]
            bug_prob = float(probs[1]) if probs.shape[0] > 1 else float(probs[0])
            return self._probability_to_risk(bug_prob)
        except Exception as e:
            print(f"Hybrid prediction error: {e}")
            return None, None

    def _ast_rule_predict(self, feats):
        """
        Fallback used only when no trained model is available.
        Scores structural code-smell signals from the AST features.
        """
        f_cc = min(feats["cyclomatic_complexity"] / 20.0, 1.0)
        f_dec = min((feats["decision_count"] / max(feats["num_functions"], 1)) / 5.0, 1.0)
        f_empty = min(feats["empty_catch_count"] / 2.0, 1.0)
        f_todo = min(feats["todo_comment_count"] / 3.0, 1.0)
        f_long = min(feats["long_function_count"] / 3.0, 1.0)
        f_size = min(feats["num_lines"] / 500.0, 1.0)

        score = (f_cc * 0.30) + (f_dec * 0.20) + (f_empty * 0.15) + (f_todo * 0.10) + (f_long * 0.15) + (f_size * 0.10)

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

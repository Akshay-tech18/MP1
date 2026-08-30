import os
from fastapi import FastAPI, Depends, HTTPException, Header, status
from typing import Optional
from dotenv import load_dotenv

# Load env variables
load_dotenv()

from app.schemas import (
    FileFeatures, PredictBatchRequest, PredictResponse, 
    PredictBatchResponse, HealthResponse, RiskLevel,
    CodeFile, CodePredictBatchRequest
)
from app.predictor import BugPredictor

# Initialize FastAPI app
app = FastAPI(
    title="DevPilot Bug Prediction ML Service",
    description="Microservice for predicting code defect risk using XGBoost and Random Forest models."
)

# API key from environment
ML_SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "dummy_ml_key")

# Initialize BugPredictor singleton
predictor = BugPredictor()

def verify_api_key(x_ml_service_key: Optional[str] = Header(None)):
    """
    Dependency to verify incoming requests have the correct API key.
    """
    if ML_SERVICE_API_KEY and x_ml_service_key != ML_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-ML-Service-Key header."
        )

@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health probe to verify service availability and check if models are loaded.
    """
    xgb_loaded = predictor.xgb_model is not None
    rf_loaded = predictor.rf_model is not None
    return HealthResponse(
        status="healthy",
        models_loaded={
            "xgboost": xgb_loaded,
            "random_forest": rf_loaded
        },
        code_models={
            "codebert": predictor.embedder.available,
            "hybrid": predictor.hybrid_model is not None
        }
    )

@app.post("/predict", response_model=PredictResponse, dependencies=[Depends(verify_api_key)])
def predict_single(features: FileFeatures):
    """
    Predict defect risk for a single file.
    """
    try:
        return predictor.predict_features(features)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction error: {str(e)}"
        )

@app.post("/predict/batch", response_model=PredictBatchResponse, dependencies=[Depends(verify_api_key)])
def predict_batch(request: PredictBatchRequest):
    """
    Predict defect risk for a batch of files (up to 50 files).
    """
    if len(request.files) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size exceeds maximum limit of 50 files."
        )
    
    try:
        predictions = []
        summary = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        
        for file_feat in request.files:
            pred = predictor.predict_features(file_feat)
            predictions.append(pred)
            summary[pred.risk_level.value] += 1
            
        return PredictBatchResponse(
            predictions=predictions,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(e)}"
        )

@app.post("/predict/code", response_model=PredictResponse, dependencies=[Depends(verify_api_key)])
def predict_code_single(code_file: CodeFile):
    """
    Predict defect risk by reading the actual source code content
    (CodeBERT semantic model + AST features + hybrid classifier).
    """
    try:
        return predictor.predict_code(code_file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code prediction error: {str(e)}"
        )

@app.post("/predict/code/batch", response_model=PredictBatchResponse, dependencies=[Depends(verify_api_key)])
def predict_code_batch(request: CodePredictBatchRequest):
    """
    Predict defect risk for a batch of source files by reading their content
    (up to 50 files).
    """
    if len(request.files) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Batch size exceeds maximum limit of 50 files."
        )

    try:
        predictions = []
        summary = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}

        for file in request.files:
            pred = predictor.predict_code(file)
            predictions.append(pred)
            summary[pred.risk_level.value] += 1

        return PredictBatchResponse(
            predictions=predictions,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code batch prediction error: {str(e)}"
        )

@app.post("/model/reload", dependencies=[Depends(verify_api_key)])
def reload_models():
    """
    Trigger the predictor to reload models from disk (useful after training completes).
    """
    predictor.load_models()
    code_models = predictor.reload_code_models()
    return {
        "success": True,
        "message": "Models reloaded successfully.",
        "models_loaded": {
            "xgboost": predictor.xgb_model is not None,
            "random_forest": predictor.rf_model is not None
        },
        "code_models": code_models
    }

from pydantic import BaseModel, Field
from typing import List, Dict
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class FileFeatures(BaseModel):
    file_path: str
    commit_frequency: float = Field(..., description="Commits touching this file per week over last 30 days")
    code_churn: float = Field(..., description="Sum of lines added + deleted across commits")
    num_contributors: int = Field(..., description="Number of distinct authors committing to this file")
    pr_count: int = Field(..., description="Number of pull requests containing this file")
    bug_fix_ratio: float = Field(..., description="Proportion of commits with bug-fix keywords")

class PredictBatchRequest(BaseModel):
    files: List[FileFeatures]

class CodeFile(BaseModel):
    file_path: str
    code: str = Field(..., description="Raw source code content of the file")
    language: str = Field(
        "auto",
        description="Language of the code: python, java, javascript, go, ruby, php, or 'auto' (detected from file_path extension)"
    )

class CodePredictBatchRequest(BaseModel):
    files: List[CodeFile]

class ModelComparison(BaseModel):
    xgboost_risk: RiskLevel
    xgboost_confidence: float
    rf_risk: RiskLevel
    rf_confidence: float
    agreement: bool

class PredictResponse(BaseModel):
    file_path: str
    risk_level: RiskLevel  # Primary model (XGBoost) output
    risk_score: float      # Primary model confidence
    model_comparison: ModelComparison

class PredictBatchResponse(BaseModel):
    predictions: List[PredictResponse]
    summary: Dict[str, int]

class HealthResponse(BaseModel):
    status: str
    models_loaded: Dict[str, bool]
    code_models: Dict[str, bool] = Field(
        default_factory=lambda: {"codebert": False, "hybrid": False}
    )

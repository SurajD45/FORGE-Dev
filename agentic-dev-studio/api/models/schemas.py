"""Pydantic schemas for V2 API"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum

# Enums
class PipelineStatus(str, Enum):
    QUEUED = "queued"
    STAGE_1_RUNNING = "stage_1_running"
    AWAITING_USER_INPUT = "awaiting_user_input"
    STAGE_2_RUNNING = "stage_2_running"
    STAGE_3_RUNNING = "stage_3_running"
    STAGE_4_RUNNING = "stage_4_running"
    COMPLETED = "completed"
    FAILED = "failed"

class ArtifactType(str, Enum):
    TRD_JSON = "trd_json"
    TRD_MD = "trd_md"
    ARCH_JSON = "arch_json"
    ARCH_MD = "arch_md"
    GENERATED_FILE = "generated_file"
    README = "readme"
    REVIEW_REPORT = "review_report"

# Request schemas
class SubmitProjectRequest(BaseModel):
    project_idea: str = Field(
        ..., 
        min_length=10,
        max_length=2000,
        description="Natural language description of the project"
    )

class ResumeProjectRequest(BaseModel):
    pipeline_id: str = Field(
        ...,
        description="UUID of the pipeline run to resume"
    )
    answers: List[str] = Field(
        ...,
        min_length=1,
        description="User's answers to the Explorer Agent's questions"
    )

class AuthRegisterRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)

class AuthLoginRequest(BaseModel):
    email: str
    password: str

# Response schemas
class SubmitProjectResponse(BaseModel):
    pipeline_id: str
    status: PipelineStatus
    message: str

class PipelineStatusResponse(BaseModel):
    pipeline_id: str
    status: PipelineStatus
    current_stage: int
    created_at: datetime
    updated_at: datetime
    error_message: Optional[str] = None
    project_idea: Optional[str] = None
    questions: Optional[List[Any]] = None

class ArtifactResponse(BaseModel):
    artifact_type: ArtifactType
    file_name: str
    download_url: str

class PipelineResultResponse(BaseModel):
    pipeline_id: str
    status: PipelineStatus
    artifacts: List[ArtifactResponse]
    project_idea: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
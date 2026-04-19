"""Pipeline/Project endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from supabase import Client
from typing import List

from api.dependencies import get_supabase_client, get_current_user
from api.models.schemas import (
    SubmitProjectRequest, 
    SubmitProjectResponse,
    PipelineStatusResponse,
    PipelineResultResponse,
    PipelineStatus,
    ArtifactResponse
)
from api.worker.tasks import run_pipeline_task
from api.utils.storage_uploader import get_artifact_download_urls

router = APIRouter(prefix="/pipeline", tags=["Pipeline"])


@router.post("/submit", response_model=SubmitProjectResponse)
async def submit_project(
    request: SubmitProjectRequest,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Submit new project for pipeline processing"""
    pipeline_run = supabase.table('pipeline_runs').insert({
        "user_id": current_user.id,
        "project_idea": request.project_idea,
        "status": PipelineStatus.QUEUED.value,
        "current_stage": 0
    }).execute()
    
    pipeline_id = pipeline_run.data[0]['id']
    run_pipeline_task.delay(pipeline_id, current_user.id, request.project_idea)
    
    return SubmitProjectResponse(
        pipeline_id=pipeline_id,
        status=PipelineStatus.QUEUED,
        message="Pipeline queued successfully."
    )


@router.get("/runs", response_model=List[PipelineStatusResponse])
async def list_pipeline_runs(
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """List all pipeline runs for the current user"""
    result = supabase.table('pipeline_runs')\
        .select('*')\
        .eq('user_id', current_user.id)\
        .order('created_at', desc=True)\
        .execute()
    
    runs = [
        PipelineStatusResponse(
            pipeline_id=r['id'],
            status=PipelineStatus(r['status']),
            current_stage=r['current_stage'],
            created_at=r['created_at'],
            updated_at=r['updated_at'],
            error_message=r.get('error_message')
        )
        for r in result.data
    ]
    return runs


@router.get("/status/{pipeline_id}", response_model=PipelineStatusResponse)
async def get_pipeline_status(
    pipeline_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get pipeline status"""
    result = supabase.table('pipeline_runs')\
        .select('*')\
        .eq('id', pipeline_id)\
        .eq('user_id', current_user.id)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    run = result.data[0]
    return PipelineStatusResponse(
        pipeline_id=run['id'],
        status=PipelineStatus(run['status']),
        current_stage=run['current_stage'],
        created_at=run['created_at'],
        updated_at=run['updated_at'],
        error_message=run.get('error_message')
    )


@router.get("/result/{pipeline_id}", response_model=PipelineResultResponse)
async def get_pipeline_result(
    pipeline_id: str,
    current_user = Depends(get_current_user),
    supabase: Client = Depends(get_supabase_client)
):
    """Get pipeline results with download URLs"""
    run_result = supabase.table('pipeline_runs')\
        .select('status')\
        .eq('id', pipeline_id)\
        .eq('user_id', current_user.id)\
        .execute()
    
    if not run_result.data:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    if run_result.data[0]['status'] != PipelineStatus.COMPLETED.value:
        raise HTTPException(
            status_code=400, 
            detail=f"Pipeline not completed. Current status: {run_result.data[0]['status']}"
        )
    
    artifacts_data = get_artifact_download_urls(supabase, pipeline_id, current_user.id)
    
    artifacts = [
        ArtifactResponse(
            artifact_type=a['artifact_type'],
            file_name=a['file_name'],
            download_url=a['download_url']
        )
        for a in artifacts_data
    ]
    
    return PipelineResultResponse(
        pipeline_id=pipeline_id,
        status=PipelineStatus.COMPLETED,
        artifacts=artifacts
    )
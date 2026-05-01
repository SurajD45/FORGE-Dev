"""Celery tasks for pipeline execution"""
from api.worker.celery_app import celery_app
from api.dependencies import get_supabase_client
from api.utils.storage_uploader import upload_artifacts
import logging
import os
import sys

# Add parent directory to path to import V1 pipeline
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from pipeline.orchestrator import run_pipeline_with_exploration, resume_pipeline

logger = logging.getLogger(__name__)

@celery_app.task(name="run_pipeline_task", bind=True)
def run_pipeline_task(self, pipeline_id: str, user_id: str, project_idea: str):
    """
    Execute the V1 pipeline for a project (initial submission).
    
    Args:
        pipeline_id: UUID from pipeline_runs table
        user_id: UUID of user who submitted
        project_idea: Natural language project description
    """
    logger.info(f"Pipeline task started: {pipeline_id}")
    
    # Get Supabase client
    supabase = get_supabase_client()
    
    # Update status to stage_1_running
    supabase.table('pipeline_runs').update({
        'status': 'stage_1_running',
        'current_stage': 1
    }).eq('id', pipeline_id).execute()
    
    try:
        # Run pipeline with exploration (may halt for user input)
        result = run_pipeline_with_exploration(
            project_idea=project_idea,
            pipeline_id=pipeline_id,
            supabase_client=supabase
        )
        
        # Check if the pipeline halted for user input
        if result.get('halted'):
            logger.info(f"Pipeline halted for user input: {pipeline_id}")
            return {
                "status": "awaiting_user_input",
                "pipeline_id": pipeline_id,
                "reason": result.get("reason", "awaiting_user_input")
            }
        
        if not result['success']:
            logger.error(f"Pipeline failed: {result.get('error')}")
            supabase.table('pipeline_runs').update({
                'status': 'failed',
                'error_message': result.get('error')
            }).eq('id', pipeline_id).execute()
            return {"status": "failed", "error": result.get('error')}
        
        # Success - orchestrator already updated status to 'completed'
        logger.info(f"Pipeline completed: {pipeline_id}")
        
        # Upload artifacts to Supabase Storage
        uploaded_artifacts = _upload_pipeline_artifacts(
            supabase, user_id, pipeline_id, result
        )
        
        return {
            "status": "completed",
            "pipeline_id": pipeline_id,
            "output_dir": result.get('output_dir'),
            "artifacts_uploaded": uploaded_artifacts
        }
        
    except Exception as e:
        logger.exception(f"Pipeline task exception: {e}")
        supabase.table('pipeline_runs').update({
            'status': 'failed',
            'error_message': str(e)
        }).eq('id', pipeline_id).execute()
        return {"status": "failed", "error": str(e)}


@celery_app.task(name="resume_pipeline_task", bind=True)
def resume_pipeline_task(self, pipeline_id: str, user_id: str):
    """
    Resume a pipeline that was halted for user input.
    
    Reads the existing pipeline_runs record to retrieve project_idea
    and conversation_history, then calls the orchestrator's resume flow.
    
    Args:
        pipeline_id: UUID from pipeline_runs table
        user_id: UUID of user who submitted
    """
    logger.info(f"Resume pipeline task started: {pipeline_id}")
    
    supabase = get_supabase_client()
    
    # Fetch the existing pipeline state
    run_result = supabase.table('pipeline_runs')\
        .select('project_idea, conversation_history, current_round')\
        .eq('id', pipeline_id)\
        .execute()
    
    if not run_result.data:
        logger.error(f"Pipeline not found for resume: {pipeline_id}")
        return {"status": "failed", "error": "Pipeline not found"}
    
    run = run_result.data[0]
    project_idea = run['project_idea']
    conversation_history = run.get('conversation_history', []) or []
    current_round = run.get('current_round', 0) or 0
    
    try:
        result = resume_pipeline(
            project_idea=project_idea,
            conversation_history=conversation_history,
            current_round=current_round,
            pipeline_id=pipeline_id,
            supabase_client=supabase
        )
        
        # Check if the pipeline halted again for more user input
        if result.get('halted'):
            logger.info(f"Pipeline halted again for user input: {pipeline_id}")
            return {
                "status": "awaiting_user_input",
                "pipeline_id": pipeline_id,
                "reason": result.get("reason", "awaiting_user_input")
            }
        
        if not result['success']:
            logger.error(f"Resume pipeline failed: {result.get('error')}")
            supabase.table('pipeline_runs').update({
                'status': 'failed',
                'error_message': result.get('error')
            }).eq('id', pipeline_id).execute()
            return {"status": "failed", "error": result.get('error')}
        
        logger.info(f"Pipeline completed after resume: {pipeline_id}")
        
        # Upload artifacts to Supabase Storage
        uploaded_artifacts = _upload_pipeline_artifacts(
            supabase, user_id, pipeline_id, result
        )
        
        return {
            "status": "completed",
            "pipeline_id": pipeline_id,
            "output_dir": result.get('output_dir'),
            "artifacts_uploaded": uploaded_artifacts
        }
        
    except Exception as e:
        logger.exception(f"Resume pipeline task exception: {e}")
        supabase.table('pipeline_runs').update({
            'status': 'failed',
            'error_message': str(e)
        }).eq('id', pipeline_id).execute()
        return {"status": "failed", "error": str(e)}


def _upload_pipeline_artifacts(supabase, user_id, pipeline_id, result):
    """Shared helper to upload artifacts after pipeline completion."""
    artifact_count = 0
    try:
        logger.info(f"Uploading artifacts for pipeline {pipeline_id}")
        uploaded_artifacts = upload_artifacts(
            supabase=supabase,
            user_id=user_id,
            pipeline_id=pipeline_id,
            project_name=result['project_name'],
            output_dir=result['output_dir']
        )
        artifact_count = len(uploaded_artifacts)
        logger.info(f"Uploaded {artifact_count} artifacts")
    except Exception as e:
        logger.error(f"Artifact upload failed (non-critical): {e}")
        # Don't fail the entire pipeline if upload fails
    return artifact_count
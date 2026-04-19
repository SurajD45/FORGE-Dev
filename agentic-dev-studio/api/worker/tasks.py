"""Celery tasks for pipeline execution"""
from api.worker.celery_app import celery_app
from api.dependencies import get_supabase_client
from api.utils.storage_uploader import upload_artifacts
import logging
import os
import sys

# Add parent directory to path to import V1 pipeline
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from pipeline.orchestrator import run_pipeline_non_interactive

logger = logging.getLogger(__name__)

@celery_app.task(name="run_pipeline_task", bind=True)
def run_pipeline_task(self, pipeline_id: str, user_id: str, project_idea: str):
    """
    Execute the V1 pipeline for a project
    
    Args:
        pipeline_id: UUID from pipeline_runs table
        user_id: UUID of user who submitted
        project_idea: Natural language project description
    """
    logger.info(f"Pipeline task started: {pipeline_id}")
    
    # Get Supabase client
    supabase = get_supabase_client()
    
    # Update status to stage_1_running (will be updated by orchestrator)
    supabase.table('pipeline_runs').update({
        'status': 'stage_1_running',
        'current_stage': 1
    }).eq('id', pipeline_id).execute()
    
    try:
        # Run V1 pipeline in non-interactive mode
        result = run_pipeline_non_interactive(
            project_idea=project_idea,
            pipeline_id=pipeline_id,
            supabase_client=supabase
        )
        
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
        try:
            logger.info(f"Uploading artifacts for pipeline {pipeline_id}")
            uploaded_artifacts = upload_artifacts(
                supabase=supabase,
                user_id=user_id,
                pipeline_id=pipeline_id,
                project_name=result['project_name'],
                output_dir=result['output_dir']
            )
            logger.info(f"Uploaded {len(uploaded_artifacts)} artifacts")
        except Exception as e:
            logger.error(f"Artifact upload failed (non-critical): {e}")
            # Don't fail the entire pipeline if upload fails
        
        return {
            "status": "completed",
            "pipeline_id": pipeline_id,
            "output_dir": result.get('output_dir'),
            "artifacts_uploaded": len(uploaded_artifacts) if 'uploaded_artifacts' in locals() else 0
        }
        
    except Exception as e:
        logger.exception(f"Pipeline task exception: {e}")
        supabase.table('pipeline_runs').update({
            'status': 'failed',
            'error_message': str(e)
        }).eq('id', pipeline_id).execute()
        return {"status": "failed", "error": str(e)}
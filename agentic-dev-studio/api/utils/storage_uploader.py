"""Supabase Storage artifact uploader"""
import os
from typing import List, Dict
from supabase import Client
import logging

logger = logging.getLogger(__name__)

ARTIFACT_TYPE_MAP = {
    'TRD.json': 'trd_json',
    'TRD.md': 'trd_md',
    'ARCH.json': 'arch_json',
    'ARCH.md': 'arch_md',
    'README.md': 'readme',
    'REVIEW_REPORT.md': 'review_report',
}

def upload_artifacts(
    supabase: Client,
    user_id: str,
    pipeline_id: str,
    project_name: str,
    output_dir: str
) -> List[Dict]:
    """
    Upload all generated artifacts to Supabase Storage
    
    Args:
        supabase: Supabase client
        user_id: User UUID
        pipeline_id: Pipeline run UUID
        project_name: Name of generated project
        output_dir: Path to generated files (/app/output/generated/{project_name})
    
    Returns:
        List of uploaded artifacts with metadata
    """
    uploaded_artifacts = []
    bucket_name = 'pipeline-artifacts'
    
    # Base storage path: {user_id}/{pipeline_id}/
    base_storage_path = f"{user_id}/{pipeline_id}"
    
    try:
        # 1. Upload TRD and ARCH files from /app/output/
        output_root = '/app/output' if os.path.exists('/app/output') else 'output'
        
        for filename in ['TRD.json', 'TRD.md', 'ARCH.json', 'ARCH.md']:
            file_path = os.path.join(output_root, filename)
            if os.path.exists(file_path):
                storage_path = f"{base_storage_path}/{filename}"
                _upload_single_file(
                    supabase, bucket_name, file_path, storage_path,
                    pipeline_id, filename, ARTIFACT_TYPE_MAP[filename],
                    uploaded_artifacts
                )
        
        # 2. Upload generated project files
        if os.path.exists(output_dir):
            for filename in os.listdir(output_dir):
                file_path = os.path.join(output_dir, filename)
                
                if not os.path.isfile(file_path):
                    continue
                
                # Determine artifact type
                if filename in ARTIFACT_TYPE_MAP:
                    artifact_type = ARTIFACT_TYPE_MAP[filename]
                else:
                    artifact_type = 'generated_file'
                
                # Storage path includes project folder for organization
                storage_path = f"{base_storage_path}/{project_name}/{filename}"
                
                _upload_single_file(
                    supabase, bucket_name, file_path, storage_path,
                    pipeline_id, filename, artifact_type,
                    uploaded_artifacts
                )
        
        logger.info(f"Uploaded {len(uploaded_artifacts)} artifacts for pipeline {pipeline_id}")
        return uploaded_artifacts
        
    except Exception as e:
        logger.error(f"Error uploading artifacts: {e}")
        raise


def _upload_single_file(
    supabase: Client,
    bucket_name: str,
    file_path: str,
    storage_path: str,
    pipeline_id: str,
    filename: str,
    artifact_type: str,
    uploaded_artifacts: List[Dict]
):
    """Upload a single file and record in database"""
    try:
        # Read file content
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Upload to Supabase Storage
        supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": _get_content_type(filename)}
        )
        
        # Insert artifact record in database
        supabase.table('pipeline_artifacts').insert({
            'pipeline_run_id': pipeline_id,
            'artifact_type': artifact_type,
            'file_name': filename,
            'storage_path': storage_path
        }).execute()
        
        uploaded_artifacts.append({
            'filename': filename,
            'storage_path': storage_path,
            'artifact_type': artifact_type
        })
        
        logger.info(f"Uploaded: {filename} -> {storage_path}")
        
    except Exception as e:
        logger.error(f"Failed to upload {filename}: {e}")
        # Don't fail entire upload if one file fails
        pass


def _get_content_type(filename: str) -> str:
    """Determine content type based on file extension"""
    if filename.endswith('.py'):
        return 'text/x-python'
    elif filename.endswith('.md'):
        return 'text/markdown'
    elif filename.endswith('.json'):
        return 'application/json'
    else:
        return 'text/plain'


def get_artifact_download_urls(
    supabase: Client,
    pipeline_id: str,
    user_id: str
) -> List[Dict]:
    """
    Get signed download URLs for all artifacts of a pipeline
    
    Args:
        supabase: Supabase client
        pipeline_id: Pipeline run UUID
        user_id: User UUID (for verification)
    
    Returns:
        List of artifacts with download URLs
    """
    try:
        # Fetch artifacts from database
        result = supabase.table('pipeline_artifacts')\
            .select('*')\
            .eq('pipeline_run_id', pipeline_id)\
            .execute()
        
        if not result.data:
            return []
        
        bucket_name = 'pipeline-artifacts'
        artifacts_with_urls = []
        
        for artifact in result.data:
            # Generate signed URL (valid for 1 hour)
            signed_url = supabase.storage.from_(bucket_name).create_signed_url(
                path=artifact['storage_path'],
                expires_in=3600  # 1 hour
            )
            
            artifacts_with_urls.append({
                'artifact_type': artifact['artifact_type'],
                'file_name': artifact['file_name'],
                'download_url': signed_url['signedURL']
            })
        
        return artifacts_with_urls
        
    except Exception as e:
        logger.error(f"Error generating download URLs: {e}")
        raise
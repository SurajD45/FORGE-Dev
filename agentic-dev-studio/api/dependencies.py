"""API Dependencies: Supabase client, auth helpers"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from functools import lru_cache
from api.config import get_settings

security = HTTPBearer()

@lru_cache()
def get_supabase_client() -> Client:
    """Get Supabase client (cached)"""
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key
    )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client)
):
    """Verify JWT token and return user"""
    token = credentials.credentials
    
    try:
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        
        return user_response.user
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

def check_pipeline_limit(user_id: str, supabase: Client):
    """Check if user has reached concurrent pipeline limit"""
    result = supabase.table('pipeline_runs')\
        .select('id')\
        .eq('user_id', user_id)\
        .in_('status', ['queued', 'stage_1_running', 'stage_2_running', 
                        'stage_3_running', 'stage_4_running'])\
        .execute()
    
    if len(result.data) >= 1:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Pipeline already running. Please wait for completion."
        )
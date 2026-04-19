"""Authentication endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from api.dependencies import get_supabase_client
from api.models.schemas import AuthRegisterRequest, AuthLoginRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=AuthResponse)
async def register(
    request: AuthRegisterRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """Register new user"""
    try:
        auth_response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed"
            )
        
        # Check if email confirmation is required
        if not auth_response.session:
            # Email confirmation required
            return {
                "access_token": "email_confirmation_required",
                "token_type": "bearer",
                "user_id": auth_response.user.id,
                "message": "Please check your email to confirm your account"
            }
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            user_id=auth_response.user.id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=AuthResponse)
async def login(
    request: AuthLoginRequest,
    supabase: Client = Depends(get_supabase_client)
):
    """Login existing user"""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        return AuthResponse(
            access_token=auth_response.session.access_token,
            user_id=auth_response.user.id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {str(e)}"
        )
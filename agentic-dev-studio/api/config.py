"""V2 API Configuration"""
import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    
    # Redis
    redis_url: str
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"
    
    # Rate limiting
    max_concurrent_pipelines_per_user: int = 1
    
    # Schema migration
    auto_migrate_db: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # ← ADD THIS LINE - ignores extra env vars

@lru_cache()
def get_settings():
    return Settings()
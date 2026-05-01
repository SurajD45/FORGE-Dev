"""V2 FastAPI Application"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import auth, projects
from api.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup: validate database schema before accepting requests
    from api.utils.db_migrator import validate_schema_or_die
    validate_schema_or_die(settings)
    yield
    # Shutdown: nothing needed


app = FastAPI(
    title="FORGE V2 API",
    description="Agentic Development Studio API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(projects.router)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "environment": settings.environment
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "FORGE V2 API",
        "docs": "/docs",
        "health": "/health"
    }
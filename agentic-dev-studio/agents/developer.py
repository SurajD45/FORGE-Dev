import os
import re
import json


def _call_llm(description: str) -> str:
    """Single LLM call with key rotation. Returns raw string output."""
    from utils.llm_client import call_with_key_rotation
    return call_with_key_rotation(
        model="groq/llama-3.3-70b-versatile",
        description=description,
        expected="Raw Python code only. No markdown. No code fences. No explanation."
    )


def strip_code_fences(code: str) -> str:
    """Remove markdown code fences and thinking tokens."""
    # Remove <think>...</think> blocks from reasoning models
    code = re.sub(r'<think>.*?</think>', '', code, flags=re.DOTALL)
    # Remove markdown code fences
    code = re.sub(r'^```(?:python)?\n?', '', code, flags=re.MULTILINE)
    code = re.sub(r'\n?```$', '', code, flags=re.MULTILINE)
    return code.strip()


def generate_file(
    filename: str,
    trd: dict,
    arch: dict,
    generated_so_far: dict,
    previous_error: str = ""
) -> str:
    """
    Generates Python code for a single file.
    Injects TRD + ARCH + all previously generated files as context.
    """
    responsibility = arch["module_responsibilities"].get(filename, "No description provided.")
    project_name = arch["project_name"]
    database = trd["database"]
    auth = trd["auth"]
    file_list = arch["file_list"]

    # Build context from previously generated files
    context_files = ""
    if generated_so_far:
        context_files = "\n\n--- PREVIOUSLY GENERATED FILES ---\n"
        context_files += "Use these for all imports. Match ALL class names, function names, variable names exactly.\n"
        for fname, code in generated_so_far.items():
            context_files += f"\n### {fname}\n{code}\n"

    retry_note = ""
    if previous_error:
        retry_note = f"""
CRITICAL: Your previous attempt failed with this error:
{previous_error}
You MUST fix this exact error. Do not repeat the same mistake.
"""

    file_rules = _get_file_specific_rules(filename, auth, database, file_list, generated_so_far)

    description = f"""
Generate the complete Python file: {filename}

PROJECT: {project_name}
FILE RESPONSIBILITY: {responsibility}

TRD:
{json.dumps(trd, indent=2)}

ARCH:
{json.dumps(arch, indent=2)}
{context_files}
{retry_note}

MANDATORY RULES:
1. Output raw Python code only. No markdown. No code fences. No explanation.
2. Use absolute imports only. Never use relative imports (no `from .module import`).
   Files are flat in the same directory. Import directly by filename without any package prefix.
   CORRECT: from database import get_db
   CORRECT: from models import User
   CORRECT: from config import settings
   WRONG:   from team_task_manager.database import get_db
   WRONG:   from app.database import get_db
   WRONG:   from .database import get_db
3. Every function and route must have a docstring.
4. Only import from files listed in file_list: {file_list}
5. Match all names exactly as defined in previously generated files.
6. Never use SessionLocal as a type hint in function signatures — use Session from sqlalchemy.orm instead.
   Correct: db: Session = Depends(get_db)
   Wrong:   db: SessionLocal = Depends(get_db)

DATABASE: {database}
- Use SQLAlchemy ORM for all database operations
- {"SQLALCHEMY_DATABASE_URL = 'sqlite:///./app.db'" if database == "sqlite" else "Load DATABASE_URL from environment"}

AUTH: {auth}
{_get_auth_rules(auth)}

FILE-SPECIFIC RULES:
{file_rules}
"""

    raw = _call_llm(description)
    return strip_code_fences(raw)


def _get_auth_rules(auth: str) -> str:
    if auth == "jwt":
        return """- Use python-jose for JWT encoding/decoding
- Use passlib with bcrypt for password hashing
- JWT secret and algorithm come from config settings
- All protected routes must use Depends(get_current_user)
- Never call get_db() directly — always use Depends(get_db)
- Never use SessionLocal as a type hint — use Session from sqlalchemy.orm"""
    return "- No authentication required"


def _get_file_specific_rules(
    filename: str,
    auth: str,
    database: str,
    file_list: list,
    generated_so_far: dict
) -> str:
    """Returns strict rules specific to each file type."""

    if filename == "config.py":
        return """- Use pydantic-settings BaseSettings class
- Import MUST be: from pydantic_settings import BaseSettings — NOT from pydantic import BaseSettings
- Define: PROJECT_NAME, DESCRIPTION, VERSION as strings
- If auth is jwt: define SECRET_KEY, ALGORITHM="HS256", ACCESS_TOKEN_EXPIRE_MINUTES=30
- Define DATABASE_FILE="./app.db" for sqlite
- Export a single `settings` instance at module level
- Use sensible defaults for all fields"""

    if filename == "database.py":
        return """- Import declarative_base from sqlalchemy.orm
- Define Base = declarative_base() — MANDATORY, never skip this
- For sqlite: SQLALCHEMY_DATABASE_URL = 'sqlite:///./app.db'
- For postgresql: SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL or "postgresql://user:password@localhost:5432/dbname"
  DATABASE_URL must NEVER default to None — always provide a fallback string
- Define engine = create_engine(SQLALCHEMY_DATABASE_URL)
- Define SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
- Define get_db() as a generator using yield
- Import settings from config
- Do NOT import from models.py
- Do NOT do `from sqlalchemy import engine` — engine is a local variable, not a sqlalchemy import
- Only import these from sqlalchemy: create_engine
- Only import these from sqlalchemy.orm: sessionmaker, declarative_base"""

    if filename == "models.py":
        return """- Import Base from database — never define Base here
- Import datetime from the datetime module for default values
- Define all SQLAlchemy models based on TRD features
- Every model must inherit from Base and have __tablename__
- Define relationships using relationship()
- For role field: use a simple String column, not a Python Enum class
- Do NOT import SessionLocal
- Do NOT define __init__ methods — SQLAlchemy handles instantiation automatically
- Never use settings.datetime or any settings attribute for datetime — use datetime.utcnow directly
- Set default values on Column directly: Column(DateTime, default=datetime.utcnow)
- All DateTime columns must have default=datetime.utcnow as the default value"""

    if filename == "auth.py":
        return """- Import get_db from database
- Import User from models
- Import settings from config
- Import Session from sqlalchemy.orm for type hints
- Import datetime and timedelta from datetime module — MANDATORY
- Use OAuth2PasswordBearer for oauth2_scheme — NEVER use HTTPBearer
- oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
- Define: verify_password, get_password_hash, authenticate_user, create_access_token
- In create_access_token: variable MUST be named encoded_jwt, return encoded_jwt
  CORRECT: encoded_jwt = jwt.encode(...); return encoded_jwt
  WRONG:   return encodedjwt  (typo will crash at runtime)
- get_current_user receives token as str — NOT as HTTPAuthorizationCredentials
  CORRECT: token: str = Depends(oauth2_scheme)
  WRONG:   token: HTTPAuthorizationCredentials = Depends(oauth2_scheme)
- Decode token directly: jwt.decode(token, ...) — NOT jwt.decode(token.credentials, ...)
- Define get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db))
- Define get_current_active_user(current_user: User = Depends(get_current_user)) — just return current_user
- Define get_current_active_admin: check current_user.role == "admin", raise 403 if not
- Never call get_db() directly — always Depends(get_db)
- Never use SessionLocal as type hint — use Session from sqlalchemy.orm"""

    if filename == "main.py":
        route_files = [f for f in file_list if f.endswith("_routes.py") or f == "routes.py"]
        return f"""- Create FastAPI app named exactly `app`
- Import FastAPI ONCE only at the top — NEVER import FastAPI twice in the same file
- Import and include ALL routers from: {route_files}
- Import settings from config for title, description, version
- Import Base and engine from database
- Call Base.metadata.create_all(bind=engine) on startup using @app.on_event("startup")
- Add GET /health endpoint returning {{"status": "ok"}}
- Add POST /token endpoint for JWT login — MANDATORY when auth is jwt:
  This endpoint must accept OAuth2PasswordRequestForm and return access token
  Import OAuth2PasswordRequestForm from fastapi.security
  Import authenticate_user, create_access_token from auth
  Example:
    @app.post("/token")
    def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
        user = authenticate_user(db, form_data.username, form_data.password)
        if not user:
            raise HTTPException(status_code=401, detail="Incorrect username or password")
        token = create_access_token(data={{"sub": user.username}})
        return {{"access_token": token, "token_type": "bearer"}}
- Run with uvicorn on 0.0.0.0:8000 under if __name__ == "__main__"
- Never import SessionLocal in main.py"""

    if "routes" in filename:
        return """- Import APIRouter, create router = APIRouter()
- Import Depends, HTTPException from fastapi
- Import Session from sqlalchemy.orm for type hints
- Import get_db from database
- Import models
- Import get_current_user, get_current_active_user, get_current_active_admin from auth as needed
- Import get_password_hash from auth — MANDATORY for any route that creates or updates a user
- Use db: Session = Depends(get_db) — never SessionLocal as type hint
- Define Pydantic request and response models for all endpoints
- Every route must have response_model, summary, and docstring
- Include full CRUD operations for the resource
- PASSWORD HASHING RULE — NEVER SKIP THIS:
  When creating a user: hashed_password=get_password_hash(user.password)
  When updating a user password: existing_user.hashed_password=get_password_hash(user.password)
  NEVER store plain text: hashed_password=user.password is WRONG
- OWNERSHIP VERIFICATION RULE:
  For update and delete routes: verify resource.owner_id == current_user.id before modifying
  Raise HTTPException(status_code=403) if ownership check fails
- SQLALCHEMY FILTER RULE:
  When filtering by multiple conditions use comma-separated args — NEVER Python 'and'
  CORRECT: db.query(Model).filter(Model.field1 == x, Model.field2 == y).first()
  WRONG:   db.query(Model).filter(Model.field1 == x and Model.field2 == y).first()
  Python 'and' in SQLAlchemy filter produces incorrect SQL silently
- DATETIME TYPE RULE:
  Import datetime from datetime module at top of file
  Pydantic response models must use datetime type for datetime fields — NEVER str
  CORRECT: created_at: datetime
  WRONG:   created_at: str
- CURRENT USER TYPE ANNOTATION RULE:
  current_user parameter must ALWAYS be typed as User — NEVER as any other model
  CORRECT: current_user: User = Depends(get_current_user)
  WRONG:   current_user: Product = Depends(get_current_user)
  WRONG:   current_user: Task = Depends(get_current_user)
  Import User from models at the top of every routes file"""

    return "- Follow FastAPI best practices. Keep code minimal and production-quality."


def generate_readme(
    trd: dict,
    arch: dict,
    generated_files: dict
) -> str:
    """
    Generates a README.md for the project using LLM.
    Injects full TRD, ARCH, and all generated file contents as context.
    Returns raw markdown string.
    """
    import json

    files_context = ""
    for fname, code in generated_files.items():
        files_context += f"\n### {fname}\n{code}\n"

    description = f"""
Generate a professional README.md for this FastAPI project.

PROJECT TRD:
{json.dumps(trd, indent=2)}

PROJECT ARCHITECTURE:
{json.dumps(arch, indent=2)}

GENERATED SOURCE FILES:
{files_context}

README MUST INCLUDE:
1. Project name as H1 heading
2. One-paragraph description of what the project does
3. Tech stack (FastAPI, SQLAlchemy, SQLite/PostgreSQL, JWT if applicable)
4. Prerequisites section (Python 3.11+, pip)
5. Installation steps:
   - Clone repo
   - Create virtual environment
   - pip install -r requirements.txt
   - Create .env file with required variables
   - Run: uvicorn main:app --reload
6. Environment variables table — list every variable needed with description and example value
7. API endpoints table — derived from the actual routes in the generated files:
   - Method, Path, Description, Auth required (yes/no)
8. Project structure section showing the file tree
9. A brief section on role-based access if auth is jwt

OUTPUT RULES:
- Output raw Markdown only
- No code fences around the entire output
- Use proper Markdown headers, tables, and code blocks where appropriate
- Be specific to this project — use actual model names, endpoint paths, features
- Keep it concise and professional
"""

    raw = _call_llm(description)
    # Strip any wrapping code fences the LLM may add
    raw = re.sub(r'^```(?:markdown|md)?\n?', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\n?```$', '', raw, flags=re.MULTILINE)
    # Remove thinking tokens
    raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL)
    return raw.strip()
import os
import json
import re


def _call_llm(description: str, expected: str) -> dict:
    """Single LLM call with key rotation. Returns parsed JSON or error dict."""
    from utils.llm_client import call_with_key_rotation

    raw = call_with_key_rotation(
        model="groq/llama-3.3-70b-versatile",
        description=description,
        expected=expected
    )

    match = re.search(r'(\{.*\})', raw, re.DOTALL)
    if not match:
        print(f"\nFORGE FAIL: No JSON found in Architect output.")
        print(f"RAW: {raw}")
        return {"type": "error", "message": "No JSON in response"}

    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        print(f"\nFORGE FAIL: JSON decode error in Architect output.")
        print(f"RAW: {raw}")
        return {"type": "error", "message": "JSON decode failed"}


def run_architect(trd: dict) -> dict:
    """
    Takes TRD dict. Returns raw architecture dict.
    LLM decides file structure and module responsibilities.
    Deterministic layer (arch_builder) injects mandatory files after.
    """
    description = f"""
You are designing the file structure for this FastAPI backend project.

TRD Input:
{json.dumps(trd, indent=2)}

Your job: design a minimal, production-quality file structure.

Return this exact JSON structure:
{{
  "project_name": "{trd['project_name']}",
  "file_list": ["main.py", "database.py", "models.py", "routes.py"],
  "module_responsibilities": {{
    "main.py": "FastAPI app entry point, mounts all routers",
    "database.py": "Database connection and session management",
    "models.py": "SQLAlchemy ORM models",
    "routes.py": "API route handlers"
  }},
  "dependency_order": ["database.py", "models.py", "routes.py", "main.py"],
  "entry_file": "main.py",
  "app_object": "app",
  "framework": "fastapi"
}}

STRICT RULES:
- framework must always be "fastapi"
- entry_file must always be "main.py"
- app_object must always be "app"
- file_list must include main.py, database.py, models.py
- dependency_order must list files from least dependent to most dependent
- module_responsibilities must have one entry per file in file_list
- Keep file structure minimal — maximum 8 files total for MVP
- If auth is "jwt" in TRD, include auth.py in file_list
- If features mention payments, include payments.py
- Group related routes into separate route files (e.g. user_routes.py, booking_routes.py)
- Return raw JSON only. No markdown. No code fences. No explanation.
"""

    return _call_llm(
        description,
        "Raw JSON with file_list, module_responsibilities, dependency_order, entry_file, app_object, framework."
    )
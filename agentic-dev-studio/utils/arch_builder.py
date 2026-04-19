import json
import os

OUTPUT_DIR = "/app/output" if os.path.exists("/app/output") else os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "output"
)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mandatory files injected deterministically based on TRD signals
MANDATORY_FILES = {
    "always": {
        "main.py": "FastAPI app entry point, mounts all routers",
        "database.py": "Database connection and session management",
        "models.py": "SQLAlchemy ORM models",
        "config.py": "Environment variables and app configuration",
    },
    "jwt": {
        "auth.py": "JWT token creation, validation, and auth dependencies"
    },
    "postgresql": {
        "alembic.ini": "Alembic migration configuration"
    }
}

# These are not source code files — strip them from file_list if LLM adds them
NON_CODE_FILES = ["requirements.txt", "alembic.ini", ".env", ".gitignore", "Dockerfile"]


def build_arch(arch_raw: dict, trd: dict) -> dict:
    """
    Deterministic layer. Takes raw LLM arch output and TRD.
    Injects mandatory files based on TRD signals.
    Strips non-code files the LLM may have added.
    Returns clean, validated ARCH dict.
    """
    file_list = arch_raw.get("file_list", [])
    responsibilities = arch_raw.get("module_responsibilities", {})

    # Strip non-code files LLM may have hallucinated into file_list
    file_list = [f for f in file_list if f not in NON_CODE_FILES]
    for f in NON_CODE_FILES:
        responsibilities.pop(f, None)

    # Inject always-mandatory files
    for fname, desc in MANDATORY_FILES["always"].items():
        if fname not in file_list:
            file_list.append(fname)
            responsibilities[fname] = desc

    # Inject auth.py if jwt
    if trd.get("auth") == "jwt":
        for fname, desc in MANDATORY_FILES["jwt"].items():
            if fname not in file_list:
                file_list.append(fname)
                responsibilities[fname] = desc

    # Inject alembic.ini if postgresql — kept in responsibilities but not file_list
    if trd.get("database") == "postgresql":
        responsibilities["alembic.ini"] = MANDATORY_FILES["postgresql"]["alembic.ini"]

    # Clean dependency_order — remove any non-code files
    dependency_order = [
        f for f in arch_raw.get("dependency_order", file_list)
        if f not in NON_CODE_FILES
    ]

    arch = {
        "project_name": trd["project_name"],
        "file_list": file_list,
        "module_responsibilities": responsibilities,
        "dependency_order": dependency_order,
        "entry_file": "main.py",
        "app_object": "app",
        "framework": "fastapi",
        "database": trd["database"],
        "auth": trd["auth"]
    }

    path = os.path.join(OUTPUT_DIR, "ARCH.json")
    with open(path, "w") as f:
        json.dump(arch, f, indent=2)

    return arch


def generate_arch_markdown(arch: dict):
    md = "# Architecture Document (ARCH)\n\n"
    md += "## 01. Project Overview\n"
    md += f"- **Project Name**: {arch['project_name']}\n"
    md += f"- **Framework**: {arch['framework'].upper()}\n"
    md += f"- **Entry File**: {arch['entry_file']}\n"
    md += f"- **Database**: {arch['database']}\n"
    if arch['auth'] != 'none':
        md += f"- **Authentication**: {arch['auth'].upper()}\n"

    md += "\n## 02. File Structure\n"
    for fname in arch['file_list']:
        md += f"- `{fname}`\n"

    md += "\n## 03. Module Responsibilities\n"
    for fname, desc in arch['module_responsibilities'].items():
        md += f"- **{fname}**: {desc}\n"

    md += "\n## 04. Dependency Order\n"
    for i, fname in enumerate(arch['dependency_order'], 1):
        md += f"{i}. `{fname}`\n"

    path = os.path.join(OUTPUT_DIR, "ARCH.md")
    with open(path, "w") as f:
        f.write(md)
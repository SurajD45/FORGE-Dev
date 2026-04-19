import json
import os

# Inside Docker: writes to /app/output
# Locally: writes to output/ folder relative to project root
if os.path.exists("/app/output"):
    OUTPUT_DIR = "/app/output"
else:
    OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output")
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def build_trd(intent: dict) -> dict:
    """Deterministic decisions — no LLM involved."""
    scale = intent.get("scale", "low")
    needs_auth = intent.get("needs_auth", False)

    database = "postgresql" if scale == "high" else "sqlite"
    auth = "jwt" if needs_auth else "none"

    trd = {
        "project_name": intent.get("project_name", "unnamed-project"),
        "project_type": "api",
        "stack": "fastapi",
        "database": database,
        "auth": auth,
        "features": intent.get("features", []),
        "constraints": intent.get("constraints", []),
        "out_of_scope": intent.get("out_of_scope", []),
        "overrides": []
    }

    path = os.path.join(OUTPUT_DIR, "TRD.json")
    with open(path, "w") as f:
        json.dump(trd, f, indent=2)

    return trd


def generate_trd_markdown(trd: dict):
    """Deterministic Markdown rendering. Skips empty sections."""
    md = "# Technical Requirements Document (TRD)\n\n"
    md += "## 01. Project Overview\n"
    md += f"- **Project Name**: {trd['project_name']}\n"
    md += f"- **Stack**: {trd['stack'].upper()}\n"
    md += f"- **Database**: {trd['database']}\n"

    if trd['auth'] != 'none':
        md += f"- **Authentication**: {trd['auth'].upper()}\n"

    md += "\n## 02. Features\n"
    for feature in trd['features']:
        md += f"- {feature}\n"

    if trd.get('constraints'):
        md += "\n## 03. Constraints\n"
        for c in trd['constraints']:
            md += f"- {c}\n"

    if trd.get('out_of_scope'):
        md += "\n## 04. Out of Scope\n"
        for o in trd['out_of_scope']:
            md += f"- {o}\n"

    path = os.path.join(OUTPUT_DIR, "TRD.md")
    with open(path, "w") as f:
        f.write(md)
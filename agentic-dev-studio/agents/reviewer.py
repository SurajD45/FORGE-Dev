import json
import re


def run_llm_review(
    trd: dict,
    arch: dict,
    generated_files: dict,
    layer1_issues: list
) -> dict:
    """
    LLM semantic review using llama-3.3-70b-versatile.
    Returns structured review result:
    {
        "critical": [{"file": "x.py", "issue": "..."}],
        "warnings": [{"file": "x.py", "issue": "..."}],
        "passed": ["check description"]
    }
    """
    from utils.llm_client import call_with_key_rotation

    files_context = ""
    for fname, code in generated_files.items():
        files_context += f"\n### {fname}\n{code}\n"

    layer1_summary = ""
    if layer1_issues:
        fails = [i for i in layer1_issues if i["severity"] == "fail"]
        warns = [i for i in layer1_issues if i["severity"] == "warn"]
        layer1_summary = f"\nLayer 1 found {len(fails)} failures and {len(warns)} warnings already reported.\n"

    description = f"""
You are a senior code reviewer. Review these FastAPI project files for semantic correctness.

TRD:
{json.dumps(trd, indent=2)}

ARCH:
{json.dumps(arch, indent=2)}
{layer1_summary}

GENERATED FILES:
{files_context}

REVIEW CHECKLIST — check each item carefully:
1. Do Pydantic response models match the SQLAlchemy ORM model fields exactly?
2. Is authentication (JWT) applied to all routes that should be protected?
3. Are all TRD features represented by at least one API endpoint?
4. Are passwords hashed using passlib before storing — never stored as plain text?
5. Is ownership verified before update/delete operations (user can only modify their own data)?
6. Are HTTP status codes correct (404 for not found, 403 for forbidden, 400 for bad request)?
7. Are there any circular import risks between files?
8. Does main.py create database tables on startup?

Return ONLY this JSON structure — no markdown, no explanation:
{{
  "critical": [
    {{"file": "filename.py", "issue": "exact description of critical issue"}}
  ],
  "warnings": [
    {{"file": "filename.py", "issue": "exact description of warning"}}
  ],
  "passed": [
    "description of what passed"
  ]
}}

critical = must fix before the project can run correctly
warnings = should fix but project will still run
passed = checks that are correct
"""

    raw = call_with_key_rotation(
        model="groq/llama-3.3-70b-versatile",  # ✅ Changed from kimi-k2-instruct
        description=description,
        expected="Raw JSON only with critical, warnings, and passed arrays."
    )

    # Strip thinking tokens and code fences
    raw = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL)
    raw = re.sub(r'^```(?:json)?\n?', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\n?```$', '', raw, flags=re.MULTILINE)
    raw = raw.strip()

    # Find JSON object
    match = re.search(r'(\{.*\})', raw, re.DOTALL)
    if not match:
        print(f"    [WARN] LLM review returned no JSON. Raw: {raw[:200]}")
        return {"critical": [], "warnings": [], "passed": ["LLM review output could not be parsed"]}

    try:
        result = json.loads(match.group(1))
        # Ensure all keys exist
        result.setdefault("critical", [])
        result.setdefault("warnings", [])
        result.setdefault("passed", [])
        return result
    except json.JSONDecodeError:
        print(f"    [WARN] LLM review JSON decode failed.")
        return {"critical": [], "warnings": [], "passed": ["LLM review JSON decode failed"]}
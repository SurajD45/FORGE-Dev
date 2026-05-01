import sys
import time
import os
from agents.explorer import run_explorer, force_intent_extraction
from agents.architect import run_architect
from agents.developer import generate_file, generate_readme
from agents.reviewer import run_llm_review
from utils.ast_checker import run_checks
from utils.review_builder import generate_review_report_with_corrections
from utils.trd_builder import build_trd, generate_trd_markdown
from utils.arch_builder import build_arch, generate_arch_markdown
from utils.schema_validator import validate_trd, validate_arch
from utils.ast_validator import validate_python
from utils.dev_builder import write_generated_files, cleanup_on_failure

MAX_ROUNDS = 2
AUTH_SIGNALS = ["user", "account", "login", "profile", "member", "role", "permission"]
MAX_RETRIES = 2
INTER_FILE_DELAY = 20
BOOTSTRAP_FILES = ["config.py"]


def apply_deterministic_corrections(intent: dict) -> dict:
    features_str = " ".join(intent.get("features", [])).lower()
    if any(signal in features_str for signal in AUTH_SIGNALS):
        intent["needs_auth"] = True
    return intent


def display_questions(content: list):
    print("\n--- Project Discovery ---")
    for i, item in enumerate(content):
        if isinstance(item, dict):
            print(f"\n{i+1}. {item.get('question', item)}")
            for idx, opt in enumerate(item.get("options", [])):
                print(f"   [{idx+1}] {opt}")
        else:
            print(f"\n{i+1}. {item}")


def stage_explorer():
    print("\n========================================")
    print(" STAGE 1: Explorer Agent")
    print("========================================")

    user_prompt = input("\nDescribe your backend project idea:\n> ").strip()
    if not user_prompt:
        print("\nNo input provided. Pipeline halted.")
        sys.exit(1)

    history = [f"Initial Idea: {user_prompt}"]
    current_round = 0
    final_intent = None

    while current_round < MAX_ROUNDS:
        print(f"\n[Round {current_round + 1}/{MAX_ROUNDS}] Analysing requirements...")

        try:
            response = run_explorer(user_prompt, history)
        except Exception as e:
            print(f"\nCRITICAL FAILURE: Explorer Agent error: {e}")
            sys.exit(1)

        if response.get("type") == "error":
            print(f"\nPipeline halted: {response.get('message')}")
            sys.exit(1)

        if response.get("type") == "intent":
            final_intent = response
            break

        content = response.get("content", [])
        display_questions(content)
        user_answer = input("\nYour answer: ").strip()
        history.append(f"Questions: {content} | Answer: {user_answer}")
        current_round += 1

    if final_intent is None:
        print(f"\n[Final Round] Extracting intent from collected answers...")
        try:
            final_intent = force_intent_extraction(user_prompt, history)
        except Exception as e:
            print(f"\nCRITICAL FAILURE: Force extraction failed: {e}")
            sys.exit(1)

    if final_intent.get("type") == "error":
        print(f"\nPipeline halted: {final_intent.get('message')}")
        sys.exit(1)

    final_intent = apply_deterministic_corrections(final_intent)
    trd = build_trd(final_intent)

    try:
        validate_trd(trd)
    except Exception as e:
        print(f"\nTRD Validation Error: {e}")
        sys.exit(1)

    generate_trd_markdown(trd)

    print("\n[Stage 1 Complete]")
    print(f"  Project  : {trd['project_name']}")
    print(f"  Stack    : {trd['stack']}")
    print(f"  Database : {trd['database']}")
    print(f"  Auth     : {trd['auth']}")
    print(f"  Features : {', '.join(trd['features'])}")
    print("  TRD.json and TRD.md written to output/")

    return trd


def stage_architect(trd: dict):
    print("\n========================================")
    print(" STAGE 2: Architect Agent")
    print("========================================")
    print("\nGenerating architecture from TRD...")

    try:
        arch_raw = run_architect(trd)
    except Exception as e:
        print(f"\nCRITICAL FAILURE: Architect Agent error: {e}")
        sys.exit(1)

    if arch_raw.get("type") == "error":
        print(f"\nPipeline halted: {arch_raw.get('message')}")
        sys.exit(1)

    arch = build_arch(arch_raw, trd)

    try:
        validate_arch(arch)
    except Exception as e:
        print(f"\nARCH Validation Error: {e}")
        sys.exit(1)

    generate_arch_markdown(arch)

    print("\n[Stage 2 Complete]")
    print(f"  Files    : {', '.join(arch['file_list'])}")
    print(f"  Entry    : {arch['entry_file']}")
    print("  ARCH.json and ARCH.md written to output/")

    return arch


def _build_generation_order(arch: dict) -> list:
    file_list = set(arch["file_list"])
    dependency_order = arch.get("dependency_order", arch["file_list"])
    seen = set()
    order = []

    for f in BOOTSTRAP_FILES:
        if f in file_list and f not in seen:
            order.append(f)
            seen.add(f)

    for f in dependency_order:
        if f.endswith(".py") and f in file_list and f not in seen:
            order.append(f)
            seen.add(f)

    for f in arch["file_list"]:
        if f.endswith(".py") and f not in seen:
            order.append(f)
            seen.add(f)

    return order


def _call_with_rate_limit_retry(fn, *args, **kwargs):
    import litellm
    max_wait_retries = 3
    wait_seconds = 30

    for attempt in range(1, max_wait_retries + 1):
        try:
            return fn(*args, **kwargs)
        except litellm.RateLimitError as e:
            if attempt == max_wait_retries:
                raise
            print(f"    Rate limit hit. Waiting {wait_seconds}s before retry {attempt}/{max_wait_retries}...")
            time.sleep(wait_seconds)
            wait_seconds += 15


def _generate_single_file(filename, trd, arch, file_buffer, project_name):
    previous_error = ""
    for attempt in range(1, MAX_RETRIES + 2):
        if attempt > 1:
            print(f"    Retry {attempt - 1}/{MAX_RETRIES} for {filename}...")

        try:
            code = _call_with_rate_limit_retry(
                generate_file,
                filename=filename,
                trd=trd,
                arch=arch,
                generated_so_far=file_buffer,
                previous_error=previous_error
            )
        except Exception as e:
            print(f"\nCRITICAL FAILURE: Developer Agent error on {filename}: {e}")
            cleanup_on_failure(project_name)
            sys.exit(1)

        valid, error = validate_python(code, filename)

        if valid:
            print(f"    {filename} — AST validated")
            return code
        else:
            previous_error = error
            print(f"    AST failed: {error}")

    print(f"\nFORGE FAIL: {filename} failed AST validation after {MAX_RETRIES} retries.")
    print("Pipeline halted. No files written.")
    cleanup_on_failure(project_name)
    sys.exit(1)


def stage_developer(trd: dict, arch: dict):
    print("\n========================================")
    print(" STAGE 3: Developer Agent")
    print("========================================")

    project_name = arch["project_name"]
    generation_order = _build_generation_order(arch)

    print(f"\nGenerating {len(generation_order)} files...")
    print(f"  Order: {' -> '.join(generation_order)}")
    print(f"  Note: {INTER_FILE_DELAY}s delay between files to respect rate limits")

    file_buffer = {}

    for i, filename in enumerate(generation_order):
        if i > 0:
            time.sleep(INTER_FILE_DELAY)

        print(f"\n  Generating {filename}...")
        code = _generate_single_file(filename, trd, arch, file_buffer, project_name)
        file_buffer[filename] = code

    # All files validated — atomic write
    output_dir = write_generated_files(project_name, file_buffer)

    # Generate README.md using LLM with full project context
    print(f"\n  Generating README.md...")
    readme_generated = False
    for readme_attempt in range(1, 4):  # up to 3 attempts
        wait = INTER_FILE_DELAY * readme_attempt  # 20s, 40s, 60s
        print(f"    Waiting {wait}s before README generation (attempt {readme_attempt}/3)...")
        time.sleep(wait)
        try:
            readme_content = generate_readme(trd, arch, file_buffer)
            readme_path = os.path.join(output_dir, "README.md")
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(readme_content)
            print(f"    README.md — generated")
            readme_generated = True
            break
        except Exception as e:
            error_str = str(e)
            if "rate_limit" in error_str.lower() and readme_attempt < 3:
                print(f"    Rate limited. Will retry...")
                continue
            print(f"    README.md generation failed (non-critical): {e}")
            break

    print(f"\n[Stage 3 Complete]")
    print(f"  Generated {len(file_buffer)} files + README.md")
    print(f"  Location : {output_dir}")
    for fname in generation_order:
        print(f"    - {fname}")
    print(f"    - README.md")

    return file_buffer


def stage_reviewer(trd: dict, arch: dict, file_buffer: dict):
    print("\n========================================")
    print(" STAGE 4: Reviewer Agent")
    print("========================================")

    project_name = arch["project_name"]
    output_dir = os.path.join(
        "/app/output" if os.path.exists("/app/output") else
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"),
        "generated", project_name
    )

    # Layer 1: Deterministic AST checks
    print("\n  Layer 1: Running structural checks...")
    layer1_issues = run_checks(output_dir, arch)

    fails = [i for i in layer1_issues if i["severity"] == "fail"]
    warns = [i for i in layer1_issues if i["severity"] == "warn"]

    if fails:
        print(f"  Layer 1: {len(fails)} failure(s) found")
        for issue in fails:
            print(f"    ❌ {issue['file']}: {issue['issue']}")
    if warns:
        print(f"  Layer 1: {len(warns)} warning(s) found")
        for issue in warns:
            print(f"    ⚠️  {issue['file']}: {issue['issue']}")
    if not layer1_issues:
        print("  Layer 1: All structural checks passed ✅")

    # Layer 2: LLM semantic review
    print("\n  Layer 2: Running semantic review (kimi-k2-instruct)...")
    print(f"  Note: waiting {INTER_FILE_DELAY}s before LLM call...")
    time.sleep(INTER_FILE_DELAY)

    try:
        layer2_result = run_llm_review(trd, arch, file_buffer, layer1_issues)

        critical = layer2_result.get("critical", [])
        warnings = layer2_result.get("warnings", [])
        passed = layer2_result.get("passed", [])

        if critical:
            print(f"  Layer 2: {len(critical)} critical issue(s) found")
            for item in critical:
                print(f"    ❌ {item.get('file', '?')}: {item.get('issue', '?')}")
        if warnings:
            print(f"  Layer 2: {len(warnings)} warning(s) found")
        if passed:
            print(f"  Layer 2: {len(passed)} check(s) passed ✅")

    except Exception as e:
        print(f"  Layer 2: LLM review failed (non-critical): {e}")
        layer2_result = {"critical": [], "warnings": [], "passed": []}

    # ⭐ NEW: Auto-Correction Loop
    correction_log = []
    has_critical_issues = (
        any(i.get('severity') == 'fail' for i in layer1_issues) or
        len(layer2_result.get('critical', [])) > 0
    )
    
    if has_critical_issues:
        print("\n  Auto-Correction: Critical issues detected, attempting fixes...")
        from utils.auto_corrector import auto_correct_files
        
        file_buffer, correction_log = auto_correct_files(
            trd, arch, file_buffer, layer1_issues, layer2_result, output_dir
        )
        
        # If files were corrected, rewrite them to disk
        if any(entry['success'] for entry in correction_log):
            print("\n  Auto-Correction: Rewriting corrected files to disk...")
            write_generated_files(project_name, file_buffer)
            
            # Re-run Layer 1 checks on corrected files
            print("\n  Auto-Correction: Re-validating corrected files...")
            layer1_issues = run_checks(output_dir, arch)
            
            remaining_fails = [i for i in layer1_issues if i["severity"] == "fail"]
            if remaining_fails:
                print(f"    ⚠️  {len(remaining_fails)} issue(s) remain after correction")
            else:
                print(f"    ✅ All critical issues resolved!")

    # Generate REVIEW_REPORT.md (including correction summary)
    files_checked = list(file_buffer.keys())
    report_path = generate_review_report_with_corrections(
        project_name, layer1_issues, layer2_result, files_checked, correction_log
    )
    
    print(f"\n[Stage 4 Complete]")
    print(f"  REVIEW_REPORT.md written to {report_path}")
    
    return file_buffer  # Return updated file_buffer


def _update_pipeline_status(pipeline_id, supabase_client, stage, status, extra_fields=None):
    """Helper to update pipeline status in Supabase."""
    if not (pipeline_id and supabase_client):
        return
    try:
        update_data = {'status': status, 'current_stage': stage}
        if extra_fields:
            update_data.update(extra_fields)
        supabase_client.table('pipeline_runs').update(
            update_data
        ).eq('id', pipeline_id).execute()
    except Exception as e:
        print(f"Warning: Failed to update status: {e}")


def _fail_pipeline(pipeline_id, supabase_client, error_msg):
    """Helper to mark pipeline as failed with an error message."""
    _update_pipeline_status(pipeline_id, supabase_client, 0, 'failed', {
        'error_message': error_msg
    })


def _run_stages_2_through_4(trd, arch_unused, pipeline_id, supabase_client):
    """
    Execute Stages 2-4 after intent has been extracted.
    Shared by both the initial and resume paths.

    Returns:
        dict with {success: bool, output_dir: str, project_name: str, ...}
    """
    # Stage 2: Architect
    _update_pipeline_status(pipeline_id, supabase_client, 2, 'stage_2_running')
    arch = stage_architect(trd)

    # Stage 3: Developer
    _update_pipeline_status(pipeline_id, supabase_client, 3, 'stage_3_running')
    file_buffer = stage_developer(trd, arch)

    # Stage 4: Reviewer (with auto-correction)
    _update_pipeline_status(pipeline_id, supabase_client, 4, 'stage_4_running')
    file_buffer = stage_reviewer(trd, arch, file_buffer)

    # Success
    output_dir = os.path.join(
        "/app/output" if os.path.exists("/app/output") else
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"),
        "generated", trd['project_name']
    )

    _update_pipeline_status(pipeline_id, supabase_client, 4, 'completed')

    print("\n========================================")
    print(" Pipeline Complete")
    print("========================================")

    return {
        "success": True,
        "output_dir": output_dir,
        "project_name": trd['project_name'],
        "trd": trd,
        "arch": arch
    }


def _extract_intent_from_explorer(project_idea, history, current_round, pipeline_id, supabase_client):
    """
    Run the Explorer Agent with the given history. Handles three outcomes:
      1. Explorer returns questions → halt for user input
      2. Explorer returns intent → return the intent
      3. MAX_ROUNDS exceeded → force intent extraction

    Returns:
        dict with either:
          - {"halted": True, ...}  → pipeline should pause
          - {"intent": dict, "history": list}  → ready for stages 2-4
          - {"error": str}  → failure
    """
    print(f"\n[Round {current_round + 1}/{MAX_ROUNDS}] Analysing requirements...")

    try:
        response = run_explorer(project_idea, history)
    except Exception as e:
        _fail_pipeline(pipeline_id, supabase_client, f"Explorer failed: {e}")
        return {"error": f"Explorer failed: {e}"}

    if response.get("type") == "error":
        _fail_pipeline(pipeline_id, supabase_client, response.get('message'))
        return {"error": response.get('message')}

    # Explorer returned an intent directly — great, proceed
    if response.get("type") == "intent":
        return {"intent": response, "history": history}

    # Explorer returned questions — check if we've exceeded MAX_ROUNDS
    if current_round + 1 >= MAX_ROUNDS:
        print(f"\n[Final Round] Extracting intent from collected answers...")
        try:
            final_intent = force_intent_extraction(project_idea, history)
        except Exception as e:
            _fail_pipeline(pipeline_id, supabase_client, f"Force extraction failed: {e}")
            return {"error": f"Force extraction failed: {e}"}

        if final_intent.get("type") == "error":
            _fail_pipeline(pipeline_id, supabase_client, final_intent.get('message'))
            return {"error": final_intent.get('message')}

        return {"intent": final_intent, "history": history}

    # Explorer returned questions and we have rounds left — halt
    questions_content = response.get("content", [])
    _update_pipeline_status(pipeline_id, supabase_client, 1, 'awaiting_user_input', {
        'explorer_questions': questions_content,
        'conversation_history': history,
        'current_round': current_round + 1
    })

    print(f"\n[Stage 1 Halted] Awaiting user input. Questions sent to frontend.")
    return {
        "halted": True,
        "reason": "awaiting_user_input",
        "questions": questions_content
    }


def run_pipeline_with_exploration(project_idea: str, pipeline_id: str = None, supabase_client=None):
    """
    State-machine version of the pipeline for initial submissions.

    Called by Celery's run_pipeline_task on first submit.
    May halt at Stage 1 if the Explorer Agent generates questions.

    Args:
        project_idea: User's project description
        pipeline_id: UUID of pipeline run in Supabase
        supabase_client: Supabase client for status updates

    Returns:
        dict with:
          - {success: True, halted: True, reason: "awaiting_user_input"} if halted
          - {success: True, output_dir: str, project_name: str, ...} if completed
          - {success: False, error: str} if failed
    """
    try:
        print("=== FORGE (P1) - Agentic Dev Studio (With Exploration) ===")

        # Stage 1: Explorer
        _update_pipeline_status(pipeline_id, supabase_client, 1, 'stage_1_running')
        print("\n========================================")
        print(" STAGE 1: Explorer Agent")
        print("========================================")

        history = [f"Initial Idea: {project_idea}"]

        explorer_result = _extract_intent_from_explorer(
            project_idea, history, 0, pipeline_id, supabase_client
        )

        # If halted for user input, return cleanly
        if explorer_result.get("halted"):
            return {"success": True, "halted": True, "reason": "awaiting_user_input"}

        # If error, return failure
        if explorer_result.get("error"):
            return {"success": False, "error": explorer_result["error"]}

        # Intent extracted — proceed through stages 2-4
        final_intent = explorer_result["intent"]
        final_intent = apply_deterministic_corrections(final_intent)
        trd = build_trd(final_intent)

        try:
            validate_trd(trd)
        except Exception as e:
            _fail_pipeline(pipeline_id, supabase_client, f"TRD validation failed: {e}")
            return {"success": False, "error": f"TRD validation: {e}"}

        generate_trd_markdown(trd)
        print(f"\n[Stage 1 Complete] TRD generated for {trd['project_name']}")

        return _run_stages_2_through_4(trd, None, pipeline_id, supabase_client)

    except Exception as e:
        _fail_pipeline(pipeline_id, supabase_client, str(e))
        return {"success": False, "error": str(e)}


def resume_pipeline(
    project_idea: str,
    conversation_history: list,
    current_round: int,
    pipeline_id: str = None,
    supabase_client=None
):
    """
    Resume a pipeline that was halted for user input.

    Called by Celery's resume_pipeline_task after the user submits answers.
    The conversation_history already includes the user's latest answers
    (appended by the /resume endpoint).

    Args:
        project_idea: Original user prompt
        conversation_history: Full conversation history including latest answers
        current_round: Current exploration round number
        pipeline_id: UUID of pipeline run in Supabase
        supabase_client: Supabase client for status updates

    Returns:
        dict with same shape as run_pipeline_with_exploration
    """
    try:
        print("=== FORGE (P1) - Agentic Dev Studio (Resume) ===")

        # Stage 1 (resumed): Explorer
        _update_pipeline_status(pipeline_id, supabase_client, 1, 'stage_1_running')
        print("\n========================================")
        print(f" STAGE 1: Explorer Agent (Round {current_round + 1})")
        print("========================================")

        # Flatten structured conversation_history for the LLM
        flat_history = [f"Initial Idea: {project_idea}"]
        for entry in conversation_history:
            if isinstance(entry, dict) and 'qa_pairs' in entry:
                for pair in entry['qa_pairs']:
                    flat_history.append(str(pair))
            elif isinstance(entry, str):
                flat_history.append(entry)
            else:
                flat_history.append(str(entry))

        explorer_result = _extract_intent_from_explorer(
            project_idea, flat_history, current_round,
            pipeline_id, supabase_client
        )

        # If halted again for more user input, return cleanly
        if explorer_result.get("halted"):
            return {"success": True, "halted": True, "reason": "awaiting_user_input"}

        # If error, return failure
        if explorer_result.get("error"):
            return {"success": False, "error": explorer_result["error"]}

        # Intent extracted — proceed through stages 2-4
        final_intent = explorer_result["intent"]
        final_intent = apply_deterministic_corrections(final_intent)
        trd = build_trd(final_intent)

        try:
            validate_trd(trd)
        except Exception as e:
            _fail_pipeline(pipeline_id, supabase_client, f"TRD validation failed: {e}")
            return {"success": False, "error": f"TRD validation: {e}"}

        generate_trd_markdown(trd)
        print(f"\n[Stage 1 Complete] TRD generated for {trd['project_name']}")

        return _run_stages_2_through_4(trd, None, pipeline_id, supabase_client)

    except Exception as e:
        _fail_pipeline(pipeline_id, supabase_client, str(e))
        return {"success": False, "error": str(e)}


def run_pipeline_non_interactive(project_idea: str, pipeline_id: str = None, supabase_client=None):
    """
    Backwards-compatible wrapper. Delegates to run_pipeline_with_exploration.
    Kept for any existing callers that expect the old signature.
    """
    return run_pipeline_with_exploration(project_idea, pipeline_id, supabase_client)


def run_pipeline():
    print("=== FORGE (P1) - Agentic Dev Studio ===")

    trd = stage_explorer()
    arch = stage_architect(trd)
    file_buffer = stage_developer(trd, arch)
    stage_reviewer(trd, arch, file_buffer)

    print("\n========================================")
    print(" Pipeline Complete")
    print("========================================")
    print("  output/TRD.json")
    print("  output/TRD.md")
    print("  output/ARCH.json")
    print("  output/ARCH.md")
    print(f"  output/generated/{trd['project_name']}/")
    print("\nAll artifacts generated successfully.")
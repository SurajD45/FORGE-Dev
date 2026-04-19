"""Auto-correction loop for fixing critical issues found by Reviewer"""
import logging
from typing import Dict, List, Tuple
from utils.ast_validator import validate_python
from agents.developer import generate_file
from utils.ast_checker import run_checks
from agents.reviewer import run_llm_review
import time

logger = logging.getLogger(__name__)

INTER_FILE_DELAY = 20  # Same as orchestrator


def auto_correct_files(
    trd: dict,
    arch: dict,
    file_buffer: Dict[str, str],
    layer1_issues: List[dict],
    layer2_result: dict,
    output_dir: str
) -> Tuple[Dict[str, str], List[dict]]:
    """
    Attempt to auto-correct files with critical issues
    
    Args:
        trd: Technical Requirements Document
        arch: Architecture document
        file_buffer: Current generated files {filename: code}
        layer1_issues: AST/structural issues from Layer 1
        layer2_result: Semantic issues from Layer 2
        output_dir: Path to generated files
    
    Returns:
        (updated_file_buffer, correction_log)
    """
    
    correction_log = []
    
    # Collect critical issues by file
    critical_issues_by_file = _group_critical_issues(layer1_issues, layer2_result)
    
    if not critical_issues_by_file:
        logger.info("No critical issues found - skipping auto-correction")
        return file_buffer, []
    
    logger.info(f"Auto-correction: Found {len(critical_issues_by_file)} files with critical issues")
    
    # Attempt to fix each file (max 1 attempt per file)
    for filename, issues in critical_issues_by_file.items():
        if filename not in file_buffer:
            logger.warning(f"Skipping {filename} - not in file buffer")
            continue
        
        logger.info(f"\n  Auto-correcting: {filename}")
        logger.info(f"    Issues to fix: {len(issues)}")
        
        # Wait before LLM call
        time.sleep(INTER_FILE_DELAY)
        
        # Attempt correction
        success, new_code, log_entry = _attempt_file_correction(
            filename, issues, trd, arch, file_buffer, output_dir
        )
        
        if success:
            # Replace old code with corrected code
            file_buffer[filename] = new_code
            logger.info(f"    ✅ {filename} corrected successfully")
        else:
            logger.warning(f"    ❌ {filename} correction failed - keeping original")
        
        correction_log.append(log_entry)
    
    return file_buffer, correction_log


def _group_critical_issues(layer1_issues: List[dict], layer2_result: dict) -> Dict[str, List[str]]:
    """Group critical issues by filename"""
    issues_by_file = {}
    
    # Layer 1 failures (severity='fail')
    for issue in layer1_issues:
        if issue.get('severity') == 'fail':
            filename = issue.get('file', 'unknown')
            if filename not in issues_by_file:
                issues_by_file[filename] = []
            issues_by_file[filename].append(f"[AST] {issue.get('issue', 'Unknown issue')}")
    
    # Layer 2 critical issues
    for issue in layer2_result.get('critical', []):
        filename = issue.get('file', 'unknown')
        if filename not in issues_by_file:
            issues_by_file[filename] = []
        issues_by_file[filename].append(f"[LLM] {issue.get('issue', 'Unknown issue')}")
    
    return issues_by_file


def _attempt_file_correction(
    filename: str,
    issues: List[str],
    trd: dict,
    arch: dict,
    file_buffer: Dict[str, str],
    output_dir: str
) -> Tuple[bool, str, dict]:
    """
    Attempt to regenerate a single file with error context
    
    Returns:
        (success: bool, new_code: str, log_entry: dict)
    """
    
    # Build error context for LLM
    error_context = "\n".join([f"- {issue}" for issue in issues])
    
    full_error_message = f"""
CRITICAL ISSUES FOUND IN PREVIOUS VERSION:
{error_context}

INSTRUCTIONS:
- Fix ALL the issues listed above
- Ensure the code follows all project standards
- Do not introduce new bugs
- Keep the same functionality
"""
    
    log_entry = {
        'file': filename,
        'issues_found': issues,
        'attempt': 1,
        'success': False,
        'resolution': None
    }
    
    try:
        # Regenerate file with error context
        new_code = generate_file(
            filename=filename,
            trd=trd,
            arch=arch,
            generated_so_far=file_buffer,
            previous_error=full_error_message
        )
        
        # Validate AST
        valid, ast_error = validate_python(new_code, filename)
        
        if not valid:
            log_entry['resolution'] = f"AST validation failed: {ast_error}"
            return False, file_buffer[filename], log_entry
        
        # Write to temp file for re-checking
        import os
        temp_file_path = os.path.join(output_dir, filename)
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            f.write(new_code)
        
        # Re-run Layer 1 checks on this file only
        layer1_recheck = run_checks(output_dir, arch)
        file_still_has_fails = any(
            issue.get('file') == filename and issue.get('severity') == 'fail'
            for issue in layer1_recheck
        )
        
        if file_still_has_fails:
            log_entry['resolution'] = "Layer 1 checks still failing after correction"
            return False, file_buffer[filename], log_entry
        
        # Success!
        log_entry['success'] = True
        log_entry['resolution'] = "All critical issues resolved"
        return True, new_code, log_entry
        
    except Exception as e:
        log_entry['resolution'] = f"Exception during regeneration: {str(e)}"
        logger.error(f"Error correcting {filename}: {e}")
        return False, file_buffer[filename], log_entry


def format_correction_summary(correction_log: List[dict]) -> str:
    """Format correction log for inclusion in REVIEW_REPORT.md"""
    if not correction_log:
        return "\n## Auto-Correction\n\nNo files required auto-correction.\n"
    
    summary = "\n## Auto-Correction Summary\n\n"
    summary += f"Attempted to fix {len(correction_log)} file(s):\n\n"
    
    for entry in correction_log:
        status_icon = "✅" if entry['success'] else "❌"
        summary += f"### {status_icon} {entry['file']}\n\n"
        summary += f"**Issues Found:**\n"
        for issue in entry['issues_found']:
            summary += f"- {issue}\n"
        summary += f"\n**Resolution:** {entry['resolution']}\n\n"
    
    successes = sum(1 for e in correction_log if e['success'])
    summary += f"**Results:** {successes}/{len(correction_log)} files successfully corrected.\n"
    
    return summary
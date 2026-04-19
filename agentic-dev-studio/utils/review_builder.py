"""Generates REVIEW_REPORT.md with auto-correction summary"""
import os
from datetime import datetime

def generate_review_report_with_corrections(
    project_name: str,
    layer1_issues: list,
    layer2_result: dict,
    files_checked: list,
    correction_log: list = None
) -> str:
    """
    Generate REVIEW_REPORT.md including auto-correction results
    
    Args:
        project_name: Name of the generated project
        layer1_issues: AST/structural issues from Layer 1
        layer2_result: Semantic issues from Layer 2
        files_checked: List of files that were reviewed
        correction_log: Auto-correction attempt log
    
    Returns:
        Path to generated REVIEW_REPORT.md
    """
    
    output_dir = os.path.join(
        "/app/output" if os.path.exists("/app/output") else
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "output"),
        "generated", project_name
    )
    
    report_path = os.path.join(output_dir, "REVIEW_REPORT.md")
    
    # Build report content
    content = f"""# Code Review Report
**Project:** {project_name}
**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**Files Reviewed:** {len(files_checked)}

---

## Layer 1: Structural Checks (AST-based)

"""
    
    # Layer 1 results
    fails = [i for i in layer1_issues if i.get('severity') == 'fail']
    warns = [i for i in layer1_issues if i.get('severity') == 'warn']
    
    if not layer1_issues:
        content += "✅ **All checks passed**\n\n"
    else:
        if fails:
            content += f"### ❌ Critical Issues ({len(fails)})\n\n"
            for issue in fails:
                content += f"- **{issue.get('file', '?')}**: {issue.get('issue', '?')}\n"
            content += "\n"
        
        if warns:
            content += f"### ⚠️ Warnings ({len(warns)})\n\n"
            for issue in warns:
                content += f"- **{issue.get('file', '?')}**: {issue.get('issue', '?')}\n"
            content += "\n"
    
    # Layer 2 results
    content += "## Layer 2: Semantic Review (LLM-based)\n\n"
    
    critical = layer2_result.get('critical', [])
    warnings = layer2_result.get('warnings', [])
    passed = layer2_result.get('passed', [])
    
    if critical:
        content += f"### ❌ Critical Issues ({len(critical)})\n\n"
        for item in critical:
            content += f"- **{item.get('file', '?')}**: {item.get('issue', '?')}\n"
        content += "\n"
    
    if warnings:
        content += f"### ⚠️ Warnings ({len(warnings)})\n\n"
        for item in warnings:
            content += f"- **{item.get('file', '?')}**: {item.get('issue', '?')}\n"
        content += "\n"
    
    if passed:
        content += f"### ✅ Passed Checks ({len(passed)})\n\n"
        for item in passed:
            content += f"- {item}\n"
        content += "\n"
    
    # Auto-correction summary
    if correction_log:
        from utils.auto_corrector import format_correction_summary
        content += format_correction_summary(correction_log)
    
    # Summary
    total_critical = len(fails) + len(critical)
    total_warnings = len(warns) + len(warnings)
    
    content += f"""---

## Summary

- **Files Reviewed:** {len(files_checked)}
- **Critical Issues:** {total_critical}
- **Warnings:** {total_warnings}
- **Auto-Corrections Attempted:** {len(correction_log) if correction_log else 0}
- **Auto-Corrections Successful:** {sum(1 for e in correction_log if e.get('success')) if correction_log else 0}

"""
    
    if total_critical == 0:
        content += "✅ **All critical issues resolved. Code is ready for use.**\n"
    else:
        content += "⚠️ **Some critical issues remain. Review before deployment.**\n"
    
    # Write report
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return report_path


# Keep original function for backward compatibility
def generate_review_report(project_name, layer1_issues, layer2_result, files_checked):
    """Original function - calls new one with no correction_log"""
    return generate_review_report_with_corrections(
        project_name, layer1_issues, layer2_result, files_checked, None
    )
import ast


def validate_python(code: str, filename: str) -> tuple[bool, str]:
    """
    Attempts to parse Python code using ast.parse().
    Returns (True, "") on success.
    Returns (False, error_message) on failure.
    """
    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        error = f"SyntaxError in {filename} at line {e.lineno}: {e.msg}"
        return False, error
    except Exception as e:
        error = f"AST parse error in {filename}: {str(e)}"
        return False, error
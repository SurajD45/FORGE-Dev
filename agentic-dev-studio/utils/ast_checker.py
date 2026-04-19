import ast
import os
from typing import List, Dict


def _parse_file(filepath: str) -> ast.Module:
    """Parse a Python file and return its AST."""
    with open(filepath, "r") as f:
        source = f.read()
    return ast.parse(source)


def _get_imports(tree: ast.Module) -> List[Dict]:
    """Extract all imports from an AST."""
    imports = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            imports.append({
                "type": "from",
                "module": node.module or "",
                "names": [alias.name for alias in node.names],
                "line": node.lineno
            })
        elif isinstance(node, ast.Import):
            imports.append({
                "type": "import",
                "module": node.names[0].name,
                "names": [],
                "line": node.lineno
            })
    return imports


def _get_function_annotations(tree: ast.Module) -> List[Dict]:
    """Extract all function parameter annotations."""
    annotations = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            for arg in node.args.args:
                if arg.annotation:
                    annotations.append({
                        "function": node.name,
                        "arg": arg.arg,
                        "annotation": ast.unparse(arg.annotation),
                        "line": node.lineno
                    })
    return annotations


def _get_calls(tree: ast.Module) -> List[Dict]:
    """Extract all function calls."""
    calls = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            try:
                if isinstance(node.func, ast.Name):
                    calls.append({"name": node.func.id, "line": node.lineno})
                elif isinstance(node.func, ast.Attribute):
                    calls.append({"name": node.func.attr, "line": node.lineno})
            except Exception:
                pass
    return calls


def _is_route_handler(node) -> bool:
    """Check if a function is a FastAPI route handler (has route decorator)."""
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return False
    route_methods = {"get", "post", "put", "delete", "patch", "options", "head"}
    for decorator in node.decorator_list:
        if isinstance(decorator, ast.Attribute):
            if decorator.attr in route_methods:
                return True
        elif isinstance(decorator, ast.Call):
            if isinstance(decorator.func, ast.Attribute):
                if decorator.func.attr in route_methods:
                    return True
    return False


def run_checks(project_dir: str, arch: dict) -> List[Dict]:
    """
    Run all 7 deterministic checks on generated project files.
    Returns list of issues: {check, file, issue, severity}
    severity: "fail" | "warn"
    """
    issues = []
    file_list = set(arch.get("file_list", []))
    project_name = arch.get("project_name", "")

    py_files = [f for f in os.listdir(project_dir) if f.endswith(".py")]

    for filename in py_files:
        filepath = os.path.join(project_dir, filename)

        try:
            tree = _parse_file(filepath)
        except SyntaxError as e:
            issues.append({
                "check": "parse",
                "file": filename,
                "issue": f"SyntaxError: {e}",
                "severity": "fail"
            })
            continue

        imports = _get_imports(tree)
        annotations = _get_function_annotations(tree)
        calls = _get_calls(tree)

        # CHECK 1: Import resolution
        for imp in imports:
            module = imp["module"]
            if not module:
                continue
            # Only check local module imports (not stdlib or third-party)
            local_candidates = [f.replace(".py", "") for f in file_list if f.endswith(".py")]
            if module in local_candidates and f"{module}.py" not in file_list:
                issues.append({
                    "check": "import_resolution",
                    "file": filename,
                    "issue": f"Imports from '{module}' but '{module}.py' is not in file_list",
                    "severity": "fail",
                    "line": imp["line"]
                })

        # CHECK 2: No package-prefixed imports
        normalized_name = project_name.replace("-", "_").replace(" ", "_").lower()
        for imp in imports:
            module = imp["module"]
            if module and (module.startswith(normalized_name) or module.startswith(project_name)):
                issues.append({
                    "check": "package_prefix",
                    "file": filename,
                    "issue": f"Package-prefixed import found: 'from {module} import ...' — use flat imports only",
                    "severity": "fail",
                    "line": imp["line"]
                })

        # CHECK 3: Base import in models.py
        if filename == "models.py":
            has_base_import = any(
                imp["type"] == "from" and "database" in imp["module"] and "Base" in imp["names"]
                for imp in imports
            )
            if not has_base_import:
                issues.append({
                    "check": "base_import",
                    "file": filename,
                    "issue": "models.py does not import Base from database",
                    "severity": "fail"
                })

        # CHECK 4: No SessionLocal type hints
        for ann in annotations:
            if "SessionLocal" in ann["annotation"]:
                issues.append({
                    "check": "session_local_hint",
                    "file": filename,
                    "issue": f"SessionLocal used as type hint in function '{ann['function']}' arg '{ann['arg']}' — use Session from sqlalchemy.orm instead",
                    "severity": "fail",
                    "line": ann["line"]
                })

        # CHECK 5: get_db called directly (not via Depends)
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                for child in ast.walk(node):
                    if isinstance(child, ast.Call):
                        # Look for get_db() called directly
                        if isinstance(child.func, ast.Name) and child.func.id == "get_db":
                            # Check it's not inside a Depends() call
                            issues.append({
                                "check": "get_db_direct_call",
                                "file": filename,
                                "issue": f"get_db() called directly in '{node.name}' — use Depends(get_db) instead",
                                "severity": "fail",
                                "line": child.lineno
                            })

        # CHECK 6: All routers mounted in main.py
        if filename == "main.py":
            route_files = [f for f in file_list if f.endswith("_routes.py") or f == "routes.py"]
            with open(filepath, "r") as f:
                main_source = f.read()
            for route_file in route_files:
                module_name = route_file.replace(".py", "")
                if module_name not in main_source and route_file not in main_source:
                    issues.append({
                        "check": "router_mounting",
                        "file": "main.py",
                        "issue": f"Router from '{route_file}' is not imported or included in main.py",
                        "severity": "fail"
                    })

        # CHECK 7: Depends() outside route handlers
        # Skip known FastAPI dependency functions — Depends() is valid in these
        KNOWN_DEPENDENCY_FUNCTIONS = {
            "get_current_user", "get_current_active_user", "get_current_active_admin",
            "get_current_superuser", "get_db", "get_settings", "get_current_verified_user"
        }
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not _is_route_handler(node) and node.name not in KNOWN_DEPENDENCY_FUNCTIONS:
                    for child in ast.walk(node):
                        if isinstance(child, ast.Call):
                            if isinstance(child.func, ast.Name) and child.func.id == "Depends":
                                issues.append({
                                    "check": "depends_outside_route",
                                    "file": filename,
                                    "issue": f"Depends() used in non-route function '{node.name}' — Depends() only works in FastAPI route handlers or dependency functions",
                                    "severity": "warn",
                                    "line": child.lineno
                                })

    return issues
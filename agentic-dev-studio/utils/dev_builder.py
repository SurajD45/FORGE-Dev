import os
import shutil


def get_output_dir(project_name: str) -> str:
    """Returns the output directory for generated project files."""
    base = "/app/output" if os.path.exists("/app/output") else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "output"
    )
    return os.path.join(base, "generated", project_name)


def write_generated_files(project_name: str, file_buffer: dict):
    """
    Atomically writes all generated files to disk.
    Called only after ALL files have passed AST validation.
    file_buffer: {filename: code_string}
    """
    output_dir = get_output_dir(project_name)

    # Clean previous run if exists
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)

    os.makedirs(output_dir, exist_ok=True)

    for filename, code in file_buffer.items():
        path = os.path.join(output_dir, filename)
        with open(path, "w") as f:
            f.write(code)

    return output_dir


def cleanup_on_failure(project_name: str):
    """Removes partial output directory on pipeline failure."""
    output_dir = get_output_dir(project_name)
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
        print(f"  Cleaned up partial output: {output_dir}")
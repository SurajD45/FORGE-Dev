import json
import os


def read_json(path: str) -> dict:
    """Read and parse a JSON file. Raises FileNotFoundError if missing."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Required file not found: {path}")
    with open(path, "r") as f:
        return json.load(f)


def write_json(path: str, data: dict):
    """Write dict to JSON file. Creates parent directories if needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def write_markdown(path: str, content: str):
    """Write string content to a markdown file."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)
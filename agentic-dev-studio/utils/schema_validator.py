import json
from jsonschema import validate
from jsonschema.exceptions import ValidationError


def _validate(instance: dict, schema_path: str):
    with open(schema_path) as f:
        schema = json.load(f)
    try:
        validate(instance=instance, schema=schema)
    except ValidationError as e:
        raise ValueError(f"Validation failed:\n{e.message}")


def validate_trd(trd: dict):
    _validate(trd, "schemas/trd_schema.json")


def validate_arch(arch: dict):
    _validate(arch, "schemas/arch_schema.json")
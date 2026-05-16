from pathlib import Path

import yaml


def load_yaml(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"config not found: {path}")
    return yaml.safe_load(p.read_text())

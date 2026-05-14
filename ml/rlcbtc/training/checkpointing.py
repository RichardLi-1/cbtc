from pathlib import Path


def save_model(model, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(path))

from pathlib import Path


def save_model(model, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(path))


def latest_checkpoint(run_dir: Path) -> Path | None:
    ckpts = sorted(run_dir.glob('checkpoints/*.zip'))
    return ckpts[-1] if ckpts else None

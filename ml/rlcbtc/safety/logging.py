from pathlib import Path


def log_intervention(run_dir: Path, step: int, reason: str) -> None:
    log_path = run_dir / 'safety_interventions.log'
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open('a') as f:
        f.write(f"{step}\t{reason}\n")

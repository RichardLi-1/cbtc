from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

STATE_FILE = "training_state.json"


def training_state_path(run_dir: Path) -> Path:
    return Path(run_dir) / STATE_FILE


def load_training_state(run_dir: Path) -> dict:
    path = training_state_path(run_dir)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_training_state(run_dir: Path, **updates: object) -> dict:
    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)
    state = load_training_state(run_dir)
    state.update(updates)
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    training_state_path(run_dir).write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def save_model(model, path: Path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    model.save(str(path))


def latest_checkpoint(run_dir: Path) -> Path | None:
    run_dir = Path(run_dir)
    ckpt_dir = run_dir / "checkpoints"
    ckpts = sorted(ckpt_dir.glob("ppo_*.zip")) if ckpt_dir.exists() else []
    if ckpts:
        return ckpts[-1]
    policy = run_dir / "policy.zip"
    return policy if policy.exists() else None


def can_resume(run_dir: Path, total_timesteps: int) -> bool:
    state = load_training_state(run_dir)
    done = int(state.get("completed_timesteps", 0))
    return done > 0 and done < total_timesteps and latest_checkpoint(run_dir) is not None

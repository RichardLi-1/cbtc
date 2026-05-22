from pathlib import Path

from rlcbtc.training.checkpointing import (
    can_resume,
    latest_checkpoint,
    load_training_state,
    write_training_state,
)


def test_latest_checkpoint_none(tmp_path: Path):
    assert latest_checkpoint(tmp_path) is None


def test_training_state_roundtrip(tmp_path: Path):
    write_training_state(tmp_path, status="running", completed_timesteps=100, total_timesteps=1000)
    state = load_training_state(tmp_path)
    assert state["completed_timesteps"] == 100
    assert state["status"] == "running"


def test_can_resume_when_partial(tmp_path: Path):
    ckpt_dir = tmp_path / "checkpoints"
    ckpt_dir.mkdir()
    (ckpt_dir / "ppo_500.zip").write_bytes(b"fake")
    write_training_state(tmp_path, completed_timesteps=500, total_timesteps=1000)
    assert can_resume(tmp_path, 1000) is True


def test_can_resume_false_when_done(tmp_path: Path):
    ckpt_dir = tmp_path / "checkpoints"
    ckpt_dir.mkdir()
    (ckpt_dir / "ppo_1000.zip").write_bytes(b"fake")
    write_training_state(tmp_path, completed_timesteps=1000, total_timesteps=1000)
    assert can_resume(tmp_path, 1000) is False

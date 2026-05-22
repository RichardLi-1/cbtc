from __future__ import annotations

import json
import threading
from pathlib import Path

import numpy as np
from stable_baselines3.common.callbacks import BaseCallback

from rlcbtc.training.checkpointing import save_model, write_training_state

# Set by training API / runner to request graceful stop between learn chunks.
_stop_event = threading.Event()


def request_training_stop() -> None:
    _stop_event.set()


def clear_training_stop() -> None:
    _stop_event.clear()


def training_stop_requested() -> bool:
    return _stop_event.is_set()


class MetricsCallback(BaseCallback):
    """Append one JSON line per PPO rollout to metrics.jsonl."""

    def __init__(self, log_path: Path, verbose: int = 0):
        super().__init__(verbose)
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _on_step(self) -> bool:
        if training_stop_requested():
            return False
        return True

    def _on_rollout_end(self) -> None:
        row: dict[str, float | int] = {"timestep": int(self.num_timesteps)}
        if len(self.model.ep_info_buffer) > 0:
            rewards = [float(ep["r"]) for ep in self.model.ep_info_buffer]
            lengths = [float(ep["l"]) for ep in self.model.ep_info_buffer]
            row["ep_rew_mean"] = float(np.mean(rewards))
            row["ep_len_mean"] = float(np.mean(lengths))
        if getattr(self.model, "logger", None) is not None:
            for key, val in self.model.logger.name_to_value.items():
                try:
                    row[key] = float(val)
                except (TypeError, ValueError):
                    continue
        with self.log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row) + "\n")
        if self.verbose:
            print(f"[metrics] {row}")


class CheckpointCallback(BaseCallback):
    """Persist SB3 checkpoints and training_state.json during learn."""

    def __init__(
        self,
        run_dir: Path,
        *,
        total_timesteps: int,
        checkpoint_every_steps: int,
        verbose: int = 0,
    ):
        super().__init__(verbose)
        self.run_dir = Path(run_dir)
        self.total_timesteps = total_timesteps
        self.checkpoint_every_steps = max(1, checkpoint_every_steps)
        self.ckpt_dir = self.run_dir / "checkpoints"
        self.ckpt_dir.mkdir(parents=True, exist_ok=True)
        self._last_saved = 0

    def _on_step(self) -> bool:
        if training_stop_requested():
            return False
        if self.num_timesteps - self._last_saved >= self.checkpoint_every_steps:
            self._persist()
            self._last_saved = int(self.num_timesteps)
        return True

    def _on_training_end(self) -> None:
        self._persist()

    def _persist(self) -> None:
        step = int(self.num_timesteps)
        ckpt_path = self.ckpt_dir / f"ppo_{step}.zip"
        save_model(self.model, ckpt_path)
        save_model(self.model, self.run_dir / "policy.zip")
        write_training_state(
            self.run_dir,
            status="running",
            total_timesteps=self.total_timesteps,
            completed_timesteps=step,
            last_checkpoint=str(ckpt_path.relative_to(self.run_dir)),
        )
        if self.verbose:
            print(f"[checkpoint] saved {ckpt_path}")

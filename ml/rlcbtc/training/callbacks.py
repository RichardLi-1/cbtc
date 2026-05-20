"""SB3 hooks: persist training metrics next to other run artifacts."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from stable_baselines3.common.callbacks import BaseCallback


class MetricsCallback(BaseCallback):
    """Append one JSON line per PPO rollout to metrics.jsonl."""

    def __init__(self, log_path: Path, verbose: int = 0):
        super().__init__(verbose)
        self.log_path = Path(log_path)
        self.log_path.parent.mkdir(parents=True, exist_ok=True)

    def _on_step(self) -> bool:
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

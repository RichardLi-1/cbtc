import json
from pathlib import Path

import gymnasium as gym
import numpy as np
from gymnasium import spaces
from stable_baselines3 import PPO

from rlcbtc.training.callbacks import MetricsCallback


class _TinyEnv(gym.Env):
    def __init__(self):
        super().__init__()
        self.action_space = spaces.Box(low=-1.0, high=1.0, shape=(1,), dtype=np.float32)
        self.observation_space = spaces.Box(low=-1.0, high=1.0, shape=(1,), dtype=np.float32)
        self._step = 0

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self._step = 0
        return np.zeros(1, dtype=np.float32), {}

    def step(self, action):
        self._step += 1
        terminated = self._step >= 8
        return np.zeros(1, dtype=np.float32), 1.0, terminated, False, {}


def test_metrics_callback_writes_jsonl(tmp_path: Path):
    log_path = tmp_path / "metrics.jsonl"
    env = _TinyEnv()
    model = PPO("MlpPolicy", env, n_steps=16, batch_size=8, verbose=0)
    model.learn(total_timesteps=32, callback=MetricsCallback(log_path))
    lines = log_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) >= 1
    row = json.loads(lines[0])
    assert "timestep" in row
    assert row["timestep"] >= 16

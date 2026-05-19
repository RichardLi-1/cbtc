"""Gymnasium dispatch environment: adjust headway/dwell; physics runs underneath."""

from __future__ import annotations

import gymnasium as gym
import numpy as np
from gymnasium import spaces

from rlcbtc.envs.observation import OBS_DIM, build_observation
from rlcbtc.envs.reward import compute_reward
from rlcbtc.safety.shield import ActionShield
from rlcbtc.sim.sim_engine import SimEngine


class DispatchEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(
        self,
        horizon_steps: int = 600,
        dt_seconds: float = 1.0,
        route_len_m: float = 97_300.0,
        num_trains: int = 6,
        target_headway_sec: float = 120.0,
        shield_enabled: bool = True,
    ):
        super().__init__()
        self.horizon_steps = horizon_steps
        self.dt_seconds = dt_seconds
        self.shield_enabled = shield_enabled
        self.shield = ActionShield()
        self.engine = SimEngine(
            dt_sec=dt_seconds,
            route_len_m=route_len_m,
            num_trains=num_trains,
            target_headway_sec=target_headway_sec,
        )
        self.t = 0
        self._last_intervention = False
        self.action_space = spaces.Box(low=-1.0, high=1.0, shape=(2,), dtype=np.float32)
        self.observation_space = spaces.Box(
            low=-np.ones(OBS_DIM, dtype=np.float32) * 5.0,
            high=np.ones(OBS_DIM, dtype=np.float32) * 5.0,
            dtype=np.float32,
        )

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.t = 0
        self.engine = SimEngine(
            dt_sec=self.dt_seconds,
            num_trains=6,
            target_headway_sec=120.0,
        )
        obs = build_observation(self.engine)
        return obs, {}

    def step(self, action):
        raw = np.asarray(action, dtype=np.float32).tolist()
        if self.shield_enabled:
            state = {
                "speed_mps": max(t.speed_kph / 3.6 for t in self.engine.world.trains.values()) if self.engine.world.trains else 0.0,
                "min_slack_m": self.engine.last_metrics.min_slack_m,
            }
            safe, meta = self.shield.apply(raw, state)
            self._last_intervention = bool(meta.get("intervened"))
        else:
            safe, meta = raw, {"intervened": False}
            self._last_intervention = False

        self.engine.apply_dispatch_action(safe)
        metrics = self.engine.tick()
        self.t += 1

        obs = build_observation(self.engine)
        reward = compute_reward(
            delay_sec=metrics.mean_delay_sec,
            headway_var=metrics.headway_std_sec**2,
            violations=metrics.violations,
        )
        terminated = self.t >= self.horizon_steps
        truncated = False
        info = {
            "raw_action": raw,
            "safe_action": safe,
            "shield": meta,
            "metrics": {
                "headway_std_sec": metrics.headway_std_sec,
                "mean_delay_sec": metrics.mean_delay_sec,
                "min_slack_m": metrics.min_slack_m,
                "violations": metrics.violations,
            },
        }
        return obs, float(reward), terminated, truncated, info

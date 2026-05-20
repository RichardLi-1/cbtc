"""Run a policy through DispatchEnv and write trace + summary artifacts."""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.evaluation.replay import ReplayLogger


class DispatchPolicy(Protocol):
    def act(self, obs) -> list[float]: ...


def run_rollout(
    policy: DispatchPolicy,
    *,
    run_dir: Path,
    episodes: int = 20,
    seed: int = 42,
    env_kwargs: dict | None = None,
    trace_subdir: str = "traces",
    summary_name: str = "evaluation.json",
) -> Path:
    env_kwargs = env_kwargs or {}
    trace_dir = run_dir / trace_subdir
    replay = ReplayLogger(trace_dir)
    for ep in range(episodes):
        env = DispatchEnv(**env_kwargs)
        obs, _ = env.reset(seed=seed + ep)
        done = False
        while not done:
            action = policy.act(obs)
            obs, reward, term, trunc, info = env.step(action)
            replay.log_step(ep, env.t, obs, action, reward, info)
            done = term or trunc
    summary_path = run_dir / summary_name
    replay.flush_summary(summary_path)
    return summary_path

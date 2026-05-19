from __future__ import annotations

import json
from pathlib import Path

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.evaluation.replay import ReplayLogger
from rlcbtc.policies.factory import build_policy
from rlcbtc.utils.config import load_yaml


class Evaluator:
    def __init__(self, run_dir: Path, episodes: int = 50):
        self.run_dir = Path(run_dir)
        self.episodes = episodes

    def run(self, policy_name: str = "rule_based", env_kwargs: dict | None = None) -> None:
        env_kwargs = env_kwargs or {}
        policy = build_policy(policy_name)
        logger = ReplayLogger(self.run_dir / "eval_traces")
        for ep in range(self.episodes):
            env = DispatchEnv(**env_kwargs)
            obs, _ = env.reset(seed=ep)
            done = False
            while not done:
                action = policy.act(obs)
                obs, reward, term, trunc, info = env.step(action)
                logger.log_step(ep, env.t, obs, action, reward, info)
                done = term or trunc
        logger.flush_summary(self.run_dir / "evaluation.json")

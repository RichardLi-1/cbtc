from __future__ import annotations

from pathlib import Path

from rlcbtc.evaluation.rollout import run_rollout
from rlcbtc.policies.factory import build_policy
from rlcbtc.policies.ppo_policy import PPOPolicyAdapter
from rlcbtc.utils.logging import get_logger

log = get_logger("evaluator")


class Evaluator:
    def __init__(self, run_dir: Path, episodes: int = 50):
        self.run_dir = Path(run_dir)
        self.episodes = episodes

    def run(
        self,
        policy_name: str = "rule_based",
        env_kwargs: dict | None = None,
        seed: int = 42,
    ) -> Path:
        policy = build_policy(policy_name)
        log.info("rollout policy=%s episodes=%s seed=%s", policy_name, self.episodes, seed)
        return run_rollout(
            policy,
            run_dir=self.run_dir,
            episodes=self.episodes,
            seed=seed,
            env_kwargs=env_kwargs,
            trace_subdir="eval_traces",
        )

    def run_ppo(self, model, env_kwargs: dict | None = None, seed: int = 42) -> Path:
        log.info("rollout PPO episodes=%s seed=%s", self.episodes, seed)
        return run_rollout(
            PPOPolicyAdapter(model),
            run_dir=self.run_dir,
            episodes=self.episodes,
            seed=seed,
            env_kwargs=env_kwargs,
            trace_subdir="eval_traces",
        )

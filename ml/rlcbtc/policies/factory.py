from __future__ import annotations

from pathlib import Path

from rlcbtc.policies.ppo_policy import PPOPolicyAdapter
from rlcbtc.policies.rule_based import RuleBasedDispatchPolicy


def build_policy(name: str):
    if name == "rule_based":
        return RuleBasedDispatchPolicy()
    raise ValueError(f"Unknown policy: {name}")


def load_ppo_policy(path: Path):
    from stable_baselines3 import PPO

    model = PPO.load(str(path))
    return PPOPolicyAdapter(model)

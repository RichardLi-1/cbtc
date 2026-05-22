from __future__ import annotations

import json
from pathlib import Path

from stable_baselines3 import PPO

from rlcbtc.evaluation.evaluator import Evaluator


def run_dir_evaluation(run_dir: Path) -> Path:
    """Re-run rollout eval for an experiment directory using its saved config."""
    run_dir = Path(run_dir)
    cfg_path = run_dir / "config.json"
    cfg: dict = {}
    if cfg_path.exists():
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))

    env_cfg = cfg.get("env", {})
    env_kwargs = {
        "horizon_steps": int(env_cfg.get("episode_horizon_steps", 600)),
        "dt_seconds": float(env_cfg.get("dt_seconds", 1)),
        "shield_enabled": bool(cfg.get("safety", {}).get("shield_enabled", True)),
    }
    policy_name = cfg.get("policy", {}).get("algo", "rule_based")
    seed = int(cfg.get("seed", 42))
    episodes = int(cfg.get("eval_episodes", 50))

    evaluator = Evaluator(run_dir, episodes=episodes)
    if policy_name == "ppo" and (run_dir / "policy.zip").exists():
        model = PPO.load(str(run_dir / "policy.zip"))
        return evaluator.run_ppo(model, env_kwargs=env_kwargs, seed=seed)
    return evaluator.run(policy_name=policy_name, env_kwargs=env_kwargs, seed=seed)

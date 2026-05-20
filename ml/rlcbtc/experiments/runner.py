from __future__ import annotations

import json
from pathlib import Path

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.evaluation.rollout import run_rollout
from rlcbtc.policies.factory import build_policy
from rlcbtc.policies.ppo_policy import PPOPolicyAdapter
from rlcbtc.training.ppo_trainer import PPOTrainer
from rlcbtc.training.seed import set_global_seed
from rlcbtc.utils.logging import get_logger

log = get_logger("runner")


class ExperimentRunner:
    def __init__(self, cfg: dict, run_dir: Path):
        self.cfg = cfg
        self.run_dir = run_dir

    def _env_kwargs(self) -> dict:
        env_cfg = self.cfg.get("env", {})
        return {
            "horizon_steps": int(env_cfg.get("episode_horizon_steps", 600)),
            "dt_seconds": float(env_cfg.get("dt_seconds", 1)),
            "shield_enabled": bool(self.cfg.get("safety", {}).get("shield_enabled", True)),
        }

    def _eval_episodes(self) -> int:
        return int(self.cfg.get("eval_episodes", 20))

    def train(self) -> None:
        seed = int(self.cfg.get("seed", 42))
        set_global_seed(seed)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / "config.json").write_text(json.dumps(self.cfg, indent=2))

        algo = self.cfg.get("policy", {}).get("algo", "ppo")
        timesteps = int(self.cfg.get("total_timesteps", 50_000))
        env_kwargs = self._env_kwargs()
        eval_episodes = self._eval_episodes()

        log.info("run_dir=%s algo=%s timesteps=%s eval_episodes=%s", self.run_dir, algo, timesteps, eval_episodes)

        if algo == "ppo":
            env = DispatchEnv(**env_kwargs)
            policy_cfg = self.cfg.get("policy", {})
            model = PPOTrainer(timesteps).train(env, run_dir=self.run_dir, policy_cfg=policy_cfg)
            model_path = self.run_dir / "policy.zip"
            model.save(str(model_path))
            log.info("saved policy %s", model_path)
            summary = run_rollout(
                PPOPolicyAdapter(model),
                run_dir=self.run_dir,
                episodes=eval_episodes,
                seed=seed,
                env_kwargs=env_kwargs,
            )
            log.info("post-train eval written to %s", summary)
        elif algo == "rule_based":
            policy = build_policy("rule_based")
            summary = run_rollout(
                policy,
                run_dir=self.run_dir,
                episodes=eval_episodes,
                seed=seed,
                env_kwargs=env_kwargs,
            )
            log.info("rule_based eval written to %s", summary)
        else:
            raise ValueError(f"unsupported algo: {algo}")

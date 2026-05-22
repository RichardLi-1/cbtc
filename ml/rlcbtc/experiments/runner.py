from __future__ import annotations

import json
from pathlib import Path
from typing import Callable

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.evaluation.rollout import run_rollout
from rlcbtc.policies.factory import build_policy
from rlcbtc.policies.ppo_policy import PPOPolicyAdapter
from rlcbtc.training.checkpointing import can_resume, write_training_state
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

    def _training_opts(self) -> dict:
        training = dict(self.cfg.get("training", {}))
        if "checkpoint_every_steps" not in training and "eval_every_steps" in self.cfg:
            training.setdefault("checkpoint_every_steps", int(self.cfg["eval_every_steps"]))
        return training

    def train(self, *, resume: bool | None = None, stop_check: Callable[[], bool] | None = None) -> None:
        seed = int(self.cfg.get("seed", 42))
        set_global_seed(seed)
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / "config.json").write_text(json.dumps(self.cfg, indent=2), encoding="utf-8")

        algo = self.cfg.get("policy", {}).get("algo", "ppo")
        timesteps = int(self.cfg.get("total_timesteps", 50_000))
        env_kwargs = self._env_kwargs()
        eval_episodes = self._eval_episodes()
        training = self._training_opts()
        persist = bool(training.get("persist_checkpoints", True))
        checkpoint_every = int(training.get("checkpoint_every_steps", 50_000))
        auto_resume = bool(training.get("resume", False))
        do_resume = auto_resume if resume is None else resume
        if do_resume and not can_resume(self.run_dir, timesteps):
            do_resume = False

        write_training_state(
            self.run_dir,
            experiment=self.cfg.get("name", "experiment"),
            status="running",
            total_timesteps=timesteps,
            persist_checkpoints=persist,
        )

        log.info(
            "run_dir=%s algo=%s timesteps=%s resume=%s persist=%s",
            self.run_dir,
            algo,
            timesteps,
            do_resume,
            persist,
        )

        try:
            if algo == "ppo":
                env = DispatchEnv(**env_kwargs)
                policy_cfg = dict(self.cfg.get("policy", {}))
                policy_cfg.setdefault("checkpoint_every_steps", checkpoint_every)
                model = PPOTrainer(timesteps).train(
                    env,
                    run_dir=self.run_dir,
                    policy_cfg=policy_cfg,
                    resume=do_resume,
                    persist_checkpoints=persist,
                    checkpoint_every_steps=checkpoint_every if persist else None,
                    stop_check=stop_check,
                )
                log.info("saved policy %s", self.run_dir / "policy.zip")
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
                write_training_state(self.run_dir, status="completed", completed_timesteps=0)
                log.info("rule_based eval written to %s", summary)
            else:
                raise ValueError(f"unsupported algo: {algo}")
        except Exception:
            write_training_state(self.run_dir, status="failed")
            raise

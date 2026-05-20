from __future__ import annotations

from pathlib import Path

from stable_baselines3 import PPO

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.training.callbacks import MetricsCallback
from rlcbtc.utils.logging import get_logger

log = get_logger("ppo")


class PPOTrainer:
    def __init__(self, total_timesteps: int, learning_rate: float = 3e-4):
        self.total_timesteps = total_timesteps
        self.learning_rate = learning_rate

    def train(
        self,
        env: DispatchEnv | None = None,
        *,
        run_dir: Path | None = None,
        policy_cfg: dict | None = None,
    ):
        env = env or DispatchEnv()
        policy_cfg = policy_cfg or {}
        callbacks = []
        if run_dir is not None:
            callbacks.append(MetricsCallback(run_dir / "metrics.jsonl"))

        lr = float(policy_cfg.get("learning_rate", self.learning_rate))
        log.info(
            "PPO learn start timesteps=%s lr=%s n_steps=%s",
            self.total_timesteps,
            lr,
            policy_cfg.get("n_steps", 2048),
        )
        model = PPO(
            "MlpPolicy",
            env,
            learning_rate=lr,
            n_steps=int(policy_cfg.get("n_steps", 2048)),
            batch_size=int(policy_cfg.get("batch_size", 64)),
            gamma=float(policy_cfg.get("gamma", 0.99)),
            gae_lambda=float(policy_cfg.get("gae_lambda", 0.95)),
            clip_range=float(policy_cfg.get("clip_range", 0.2)),
            ent_coef=float(policy_cfg.get("ent_coef", 0.01)),
            verbose=0,
        )
        model.learn(total_timesteps=self.total_timesteps, callback=callbacks or None)
        log.info("PPO learn finished at timestep %s", model.num_timesteps)
        return model

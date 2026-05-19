from __future__ import annotations

import json
from pathlib import Path

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.evaluation.replay import ReplayLogger
from rlcbtc.policies.factory import build_policy
from rlcbtc.training.ppo_trainer import PPOTrainer
from rlcbtc.training.seed import set_global_seed
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

    def train(self) -> None:
        set_global_seed(int(self.cfg.get("seed", 42)))
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / "config.json").write_text(json.dumps(self.cfg, indent=2))

        algo = self.cfg.get("policy", {}).get("algo", "ppo")
        timesteps = int(self.cfg.get("total_timesteps", 50_000))

        log_lines = [f"algo={algo} timesteps={timesteps}\n"]
        if algo == "ppo":
            env = DispatchEnv(**self._env_kwargs())
            model = PPOTrainer(timesteps).train(env)
            model_path = self.run_dir / "policy.zip"
            model.save(str(model_path))
            log_lines.append(f"saved {model_path}\n")
        elif algo == "rule_based":
            self._evaluate_baseline()
            log_lines.append("rule_based baseline evaluation complete\n")
        else:
            raise ValueError(f"unsupported algo: {algo}")

        (self.run_dir / "train.log").write_text("".join(log_lines))

    def _evaluate_baseline(self, episodes: int = 20) -> None:
        policy = build_policy("rule_based")
        logger = ReplayLogger(self.run_dir / "traces")
        for ep in range(episodes):
            env = DispatchEnv(**self._env_kwargs())
            obs, _ = env.reset(seed=self.cfg.get("seed", 42) + ep)
            done = False
            while not done:
                action = policy.act(obs)
                obs, reward, term, trunc, info = env.step(action)
                logger.log_step(ep, env.t, obs, action, reward, info)
                done = term or trunc
        logger.flush_summary(self.run_dir / "evaluation.json")

from __future__ import annotations

from pathlib import Path
from typing import Callable

from stable_baselines3 import PPO

from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.training.callbacks import (
    CheckpointCallback,
    MetricsCallback,
    clear_training_stop,
    training_stop_requested,
)
from rlcbtc.training.checkpointing import (
    latest_checkpoint,
    load_training_state,
    save_model,
    write_training_state,
)
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
        resume: bool = False,
        persist_checkpoints: bool = True,
        checkpoint_every_steps: int | None = None,
        stop_check: Callable[[], bool] | None = None,
    ):
        env = env or DispatchEnv()
        policy_cfg = policy_cfg or {}
        run_dir = Path(run_dir) if run_dir is not None else None

        state = load_training_state(run_dir) if run_dir else {}
        start_timesteps = int(state.get("completed_timesteps", 0)) if resume else 0
        ckpt_path = latest_checkpoint(run_dir) if run_dir and resume else None

        lr = float(policy_cfg.get("learning_rate", self.learning_rate))
        every = int(checkpoint_every_steps or policy_cfg.get("checkpoint_every_steps", 50_000))

        if run_dir is not None:
            write_training_state(
                run_dir,
                status="running",
                total_timesteps=self.total_timesteps,
                completed_timesteps=start_timesteps,
                resume=resume,
                persist_checkpoints=persist_checkpoints,
                checkpoint_every_steps=every,
            )

        callbacks = []
        if run_dir is not None:
            callbacks.append(MetricsCallback(run_dir / "metrics.jsonl"))
            if persist_checkpoints:
                callbacks.append(
                    CheckpointCallback(
                        run_dir,
                        total_timesteps=self.total_timesteps,
                        checkpoint_every_steps=every,
                    )
                )

        if ckpt_path is not None:
            log.info("loading checkpoint %s (timesteps=%s)", ckpt_path, start_timesteps)
            model = PPO.load(str(ckpt_path), env=env)
        else:
            log.info(
                "PPO new model timesteps=%s lr=%s n_steps=%s",
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

        remaining = max(0, self.total_timesteps - int(model.num_timesteps))
        chunk_size = every if persist_checkpoints and every > 0 else remaining

        while remaining > 0:
            if stop_check and stop_check():
                break
            if training_stop_requested():
                break
            step = min(remaining, chunk_size)
            reset = int(model.num_timesteps) == 0
            model.learn(
                total_timesteps=step,
                callback=callbacks or None,
                reset_num_timesteps=reset,
                progress_bar=False,
            )
            remaining = max(0, self.total_timesteps - int(model.num_timesteps))
            if run_dir is not None:
                write_training_state(
                    run_dir,
                    status="running",
                    completed_timesteps=int(model.num_timesteps),
                )
            if stop_check and stop_check():
                break
            if training_stop_requested():
                break

        if run_dir is not None:
            save_model(model, run_dir / "policy.zip")
            stopped = (stop_check and stop_check()) or training_stop_requested()
            final_status = "stopped" if stopped and remaining > 0 else "completed"
            write_training_state(
                run_dir,
                status=final_status,
                completed_timesteps=int(model.num_timesteps),
                total_timesteps=self.total_timesteps,
            )
            clear_training_stop()

        log.info("PPO finished at timestep %s", model.num_timesteps)
        return model

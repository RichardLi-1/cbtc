import argparse
import json
from pathlib import Path

from stable_baselines3 import PPO

from rlcbtc.evaluation.evaluator import Evaluator
from rlcbtc.utils.logging import configure_logging, get_logger

log = get_logger("cli.evaluate")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    configure_logging(run_dir=run_dir, verbose=args.verbose)

    cfg_path = run_dir / "config.json"
    cfg: dict = {}
    env_kwargs = None
    policy_name = "rule_based"
    if cfg_path.exists():
        cfg = json.loads(cfg_path.read_text())
        env_cfg = cfg.get("env", {})
        env_kwargs = {
            "horizon_steps": int(env_cfg.get("episode_horizon_steps", 600)),
            "dt_seconds": float(env_cfg.get("dt_seconds", 1)),
            "shield_enabled": bool(cfg.get("safety", {}).get("shield_enabled", True)),
        }
        policy_name = cfg.get("policy", {}).get("algo", "rule_based")

    log.info("evaluating run_dir=%s policy=%s", run_dir, policy_name)
    evaluator = Evaluator(run_dir, episodes=int(cfg.get("eval_episodes", 50)))
    if policy_name == "ppo" and (run_dir / "policy.zip").exists():
        model = PPO.load(str(run_dir / "policy.zip"))
        evaluator.run_ppo(model, env_kwargs=env_kwargs)
    else:
        evaluator.run(policy_name=policy_name, env_kwargs=env_kwargs)
    log.info("done")


if __name__ == "__main__":
    main()

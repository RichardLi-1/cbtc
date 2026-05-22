import argparse
from pathlib import Path

from rlcbtc.experiments.runner import ExperimentRunner
from rlcbtc.training.checkpointing import can_resume
from rlcbtc.utils.config import load_yaml
from rlcbtc.utils.logging import configure_logging, get_logger

log = get_logger("cli.train")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--resume", action="store_true", help="Continue from latest checkpoint in run dir")
    parser.add_argument("--no-persist", action="store_true", help="Disable checkpoint saves during training")
    parser.add_argument("--verbose", "-v", action="store_true", help="debug logs on stderr")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    if args.no_persist:
        cfg.setdefault("training", {})["persist_checkpoints"] = False
    if args.resume:
        cfg.setdefault("training", {})["resume"] = True

    run_dir = Path("runs") / cfg["name"] / "latest"
    configure_logging(run_dir=run_dir, verbose=args.verbose)

    timesteps = int(cfg.get("total_timesteps", 50_000))
    if args.resume and can_resume(run_dir, timesteps):
        log.info("resuming from %s", run_dir)
    elif args.resume:
        log.warning("no checkpoint to resume; starting fresh")

    log.info("config=%s", args.config)
    runner = ExperimentRunner(cfg, run_dir)
    runner.train(resume=args.resume or bool(cfg.get("training", {}).get("resume")))
    log.info("done")


if __name__ == "__main__":
    main()

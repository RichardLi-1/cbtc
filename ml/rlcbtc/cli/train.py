import argparse
from pathlib import Path

from rlcbtc.experiments.runner import ExperimentRunner
from rlcbtc.utils.config import load_yaml
from rlcbtc.utils.logging import configure_logging, get_logger

log = get_logger("cli.train")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--verbose", "-v", action="store_true", help="debug logs on stderr")
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    run_dir = Path("runs") / cfg["name"] / "latest"
    configure_logging(run_dir=run_dir, verbose=args.verbose)

    log.info("config=%s", args.config)
    runner = ExperimentRunner(cfg, run_dir)
    runner.train()
    log.info("done")


if __name__ == "__main__":
    main()

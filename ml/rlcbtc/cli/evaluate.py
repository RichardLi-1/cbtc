import argparse
from pathlib import Path

from rlcbtc.evaluation.run_eval import run_dir_evaluation
from rlcbtc.utils.logging import configure_logging, get_logger

log = get_logger("cli.evaluate")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    configure_logging(run_dir=run_dir, verbose=args.verbose)

    summary = run_dir_evaluation(run_dir)
    log.info("wrote %s", summary)


if __name__ == "__main__":
    main()

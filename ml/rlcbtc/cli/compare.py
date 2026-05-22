import argparse
import json
from pathlib import Path

from rlcbtc.evaluation.compare import compare_runs
from rlcbtc.evaluation.run_eval import run_dir_evaluation
from rlcbtc.utils.logging import configure_logging, get_logger

log = get_logger("cli.compare")


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare RL and baseline evaluation artifacts.")
    parser.add_argument("--rl-run", required=True)
    parser.add_argument("--baseline-run", required=True)
    parser.add_argument("--out", default=None, help="Override comparison.json path")
    parser.add_argument(
        "--re-eval",
        action="store_true",
        help="Re-run batch eval on both runs (same per-run seed) before comparing",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    rl_run = Path(args.rl_run)
    configure_logging(run_dir=rl_run, verbose=args.verbose)

    baseline_run = Path(args.baseline_run)
    if args.re_eval:
        log.info("re-eval rl run %s", rl_run)
        run_dir_evaluation(rl_run)
        log.info("re-eval baseline run %s", baseline_run)
        run_dir_evaluation(baseline_run)

    out_path = Path(args.out) if args.out else None
    summary = compare_runs(rl_run, baseline_run, out_path=out_path)
    log.info("wrote comparison to %s", out_path or (rl_run / "comparison.json"))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

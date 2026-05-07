import argparse
from pathlib import Path
from rlcbtc.evaluation.compare import compare_runs


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--rl-run', required=True)
    parser.add_argument('--baseline-run', required=True)
    args = parser.parse_args()
    compare_runs(Path(args.rl_run), Path(args.baseline_run))


if __name__ == '__main__':
    main()

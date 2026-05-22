import argparse
from pathlib import Path
from rlcbtc.reports.generator import generate_report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", required=True)
    parser.add_argument("--baseline-run", default=None, help="If set, run compare before rendering report")
    args = parser.parse_args()
    baseline = Path(args.baseline_run) if args.baseline_run else None
    path = generate_report(Path(args.run_dir), baseline_run=baseline)
    print(path)


if __name__ == '__main__':
    main()

import argparse
from pathlib import Path
from rlcbtc.reports.generator import generate_report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-dir', required=True)
    args = parser.parse_args()
    generate_report(Path(args.run_dir))


if __name__ == '__main__':
    main()

import argparse
from pathlib import Path
from rlcbtc.evaluation.evaluator import Evaluator


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--run-dir', required=True)
    args = parser.parse_args()
    Evaluator(Path(args.run_dir)).run()


if __name__ == '__main__':
    main()

from pathlib import Path
from rlcbtc.experiments.runner import ExperimentRunner
from rlcbtc.utils.config import load_yaml
import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--config', required=True)
    args = parser.parse_args()

    cfg = load_yaml(args.config)
    run_dir = Path('runs') / cfg['name'] / 'latest'
    runner = ExperimentRunner(cfg, run_dir)
    runner.train()


if __name__ == '__main__':
    main()

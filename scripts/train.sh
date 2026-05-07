#!/usr/bin/env bash
set -euo pipefail
python -m rlcbtc.cli.train --config "${1:-configs/experiments/ppo_baseline.yaml}"

#!/usr/bin/env bash
set -euo pipefail
RUN_DIR="${1:-runs/ppo_baseline/latest}"
python -m rlcbtc.cli.evaluate --run-dir "${RUN_DIR}"

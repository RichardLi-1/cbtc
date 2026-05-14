#!/usr/bin/env bash
set -euo pipefail
python -m rlcbtc.cli.evaluate --run-dir "${1:-runs/ppo_baseline/latest}"

#!/usr/bin/env bash
set -euo pipefail
python -m rlcbtc.cli.compare --rl-run "$1" --baseline-run "$2"

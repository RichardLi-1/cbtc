#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 2 ]]; then
  echo "usage: $0 <rl-run> <baseline-run>" >&2
  exit 1
fi
python -m rlcbtc.cli.compare --rl-run "$1" --baseline-run "$2"

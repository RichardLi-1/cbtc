#!/usr/bin/env bash
set -euo pipefail
python -m rlcbtc.cli.report --run-dir "$1"

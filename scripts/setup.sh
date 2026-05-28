#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> backend venv"
if [[ ! -x "$ROOT/backend/venv/bin/pip" ]]; then
  python3 -m venv "$ROOT/backend/venv"
fi
"$ROOT/backend/venv/bin/pip" install -r "$ROOT/backend/requirements.txt"

echo "==> frontend"
npm install --prefix "$ROOT/frontend"

echo "==> ml venv"
if [[ ! -x "$ROOT/ml/.venv/bin/pip" ]]; then
  python3 -m venv "$ROOT/ml/.venv"
fi
"$ROOT/ml/.venv/bin/pip" install -r "$ROOT/ml/requirements.txt"

if [[ ! -f "$ROOT/ml/models/deployed/ppo_baseline/policy.zip" ]]; then
  echo "WARN: no bundled policy.zip — train with: cd ml && source .venv/bin/activate && python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml"
fi

echo "Done. Run: npm run dev"

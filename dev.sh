#!/usr/bin/env bash
# Run backend (:8000), ML API (:8001), and frontend (vite). Ctrl+C stops all.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
ML_PORT="${ML_PORT:-8001}"

if [[ ! -x "$ROOT/backend/venv/bin/uvicorn" ]]; then
  echo "backend/venv/bin/uvicorn not found — run: npm run setup" >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "frontend/node_modules missing — run: npm run setup" >&2
  exit 1
fi

pids=()
cleanup() {
  trap - INT TERM EXIT
  for pid in "${pids[@]:-}"; do
    [[ -z "$pid" ]] && continue
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  pkill -f "uvicorn main:app" 2>/dev/null || true
  pkill -f "rlcbtc.api.server:app" 2>/dev/null || true
  pkill -f "node.*vite" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

prefix() {
  local tag="$1"; shift
  "$@" 2>&1 | sed -u "s/^/[$tag] /"
}

if ! "$ROOT/backend/venv/bin/python" -c '' 2>/dev/null; then
  echo "backend/venv interpreter is broken. Run: npm run setup" >&2
  exit 1
fi

( cd "$ROOT/backend" && prefix backend ./venv/bin/uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload ) &
pids+=($!)

if [[ -x "$ROOT/ml/.venv/bin/python" ]]; then
  if [[ ! -f "$ROOT/ml/models/deployed/ppo_baseline/policy.zip" ]]; then
    echo "[ml] WARN: bundled policy.zip missing — dispatch compare will 503 until you train or copy a model" >&2
  fi
  ( cd "$ROOT/ml" && prefix ml ./.venv/bin/python -m rlcbtc.cli.serve_training --host 0.0.0.0 --port "$ML_PORT" ) &
  pids+=($!)
else
  echo "[ml] skipped — no ml/.venv (run: npm run setup)" >&2
fi

( cd "$ROOT/frontend" && prefix frontend npm run dev ) &
pids+=($!)

while true; do
  alive=0
  for pid in "${pids[@]}"; do
    kill -0 "$pid" 2>/dev/null && alive=$((alive + 1))
  done
  [[ "$alive" -eq 0 ]] && break
  sleep 1
done
echo "[dev.sh] a child process exited — shutting down" >&2

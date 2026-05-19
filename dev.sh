#!/usr/bin/env bash
# Run backend (uvicorn) + frontend (vite) together. Ctrl+C stops both.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"

if [[ ! -x "$ROOT/backend/venv/bin/uvicorn" ]]; then
  echo "backend/venv/bin/uvicorn not found — run: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi
if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
  echo "frontend/node_modules missing — run: cd frontend && npm install" >&2
  exit 1
fi

pids=()
cleanup() {
  trap - INT TERM EXIT
  # Kill each child AND its descendants (uvicorn --reload spawns a worker
  # that wouldn't die from killing just the subshell).
  for pid in "${pids[@]:-}"; do
    [[ -z "$pid" ]] && continue
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  # Also sweep anything that out-lived the subshell.
  pkill -f "uvicorn main:app" 2>/dev/null || true
  pkill -f "node.*vite"       2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

prefix() {
  local tag="$1"; shift
  "$@" 2>&1 | sed -u "s/^/[$tag] /"
}

# Sanity-check the venv interpreter: a moved venv has a dead shebang and
# uvicorn silently fails with "bad interpreter".
if ! "$ROOT/backend/venv/bin/python" -c '' 2>/dev/null; then
  echo "backend/venv interpreter is broken (likely a moved venv). Rebuild:" >&2
  echo "  rm -rf backend/venv && python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt" >&2
  exit 1
fi

( cd "$ROOT/backend" && prefix backend ./venv/bin/uvicorn main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload ) &
backend_pid=$!
pids+=($backend_pid)

( cd "$ROOT/frontend" && prefix frontend npm run dev ) &
frontend_pid=$!
pids+=($frontend_pid)

# Portable "wait for either to exit" — bash 3.2 (macOS default) lacks `wait -n`.
while kill -0 "$backend_pid" 2>/dev/null && kill -0 "$frontend_pid" 2>/dev/null; do
  sleep 1
done
echo "[dev.sh] a child process exited — shutting down" >&2

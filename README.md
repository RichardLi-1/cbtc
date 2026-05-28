# CBTC Simulator

Simplified CBTC-style simulation and control-room frontend inspired by TTC operations.

## Current status

- Backend simulation is Python-based and remains the system-of-record.
- Frontend is implemented in `frontend/` using React + Canvas.
- Frontend auto-falls back to mock mode if backend endpoints are unavailable.

## Repository layout

- `backend/`: simulation domain objects and runtime stepping
- `frontend/`: dispatch-style UI, camera/viewport, layers, controls
- `docs/PROJECT.md`: architecture notes and project intent
- `ml/`: optional RL dispatch research code (Python package, configs, tests); run from that directory

## Frontend capabilities (implemented)

- Dark dispatch panel with layered rendering:
  - track geometry
  - block occupancy overlays
  - switches and crossovers
  - signals
  - trains (with direction + safe-zone visualization)
  - labels
- Interaction model:
  - drag to pan
  - wheel to zoom at cursor
  - double-click to fit bounds
  - hover tooltips
  - click switch/signal to send manual commands
- Runtime behavior:
  - state polling (200 ms)
  - stale-data indicator and API error banner
  - mock fallback mode when backend is unreachable

## Quick start (sim + ML + UI)

```bash
npm run setup    # backend venv, frontend deps, ml venv
npm run dev      # backend :8000, ML API :8001, Vite :5173
```

Open `http://localhost:5173`. Use **DISPATCH — RULE vs ML** (bottom-left) to compare classical vs bundled PPO policy. Ctrl+Shift+C opens training config.

Bundled model: `ml/models/deployed/ppo_baseline/policy.zip` (refresh after training — see `ml/models/deployed/README.md`).

## Frontend only

```bash
cd frontend && npm install && npm run dev
```

Falls back to mock mode if backend is down. Default dev URL is `http://localhost:5173` (or next free port).

## Backend integration contract (frontend-facing)

- `GET /topology`
- `GET /state`
- `POST /commands/switch/...`
- `POST /commands/signal/...`

`vite.config.ts` proxies sim paths to `localhost:8000` and `/ml` to `localhost:8001` in development.

## Production (Docker)

```bash
npm run build:frontend
docker compose up --build
```

UI at `http://localhost:8080` (nginx → backend + ML API).

## Next recommended steps

- Add Vitest unit tests for geometry helpers.
- Add one integration test for store + API sync flow.
- Persist manual signal override behavior in backend state flow.

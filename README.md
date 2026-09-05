# TTC Train Traffic Control Simulator

A Line 1 (Yonge-University) board. Python sim is the source of truth. React + canvas is the glass.

Trains run ATO with ATP gaps, dwell at platforms, and come out of Wilson Yard (between Sheppard West and Wilson). You can hold, express, or skip a run from the map. Safe zones, labels, zoom buttons, and a high-contrast theme are in the top bar / GUIDE menu.

**GUIDE** answers “where is run 4?” and points at the UI. Events stay closed until you open them. Bottom-left **DISPATCH** switches live Rule vs PPO and can run an offline A/B (same seed). SIM time starts at 06:00, not your laptop clock.

## Run

```bash
npm run setup    # backend venv, frontend deps, ml venv
npm run dev      # sim :8000, ML :8001, UI :5173
```

Open http://localhost:5173. Frontend-only (`cd frontend && npm run dev`) falls back to mock if the sim is down.

Bundled PPO: `ml/models/deployed/ppo_baseline/policy.zip`.

## Layout

- `backend/` sim, ATO/ATP, commands, `/state`
- `frontend/` map, GUIDE, dispatch panel
- `ml/` training API and live policy
- `docs/PROJECT.md` longer design notes

Vite proxies `/topology` `/state` `/commands` to :8000 and `/ml` to :8001.

```bash
npm run build:frontend
docker compose up --build    # UI :8080
```

# Frontend integration prompt (copy into a new Cursor chat)

Use this when you are ready to wire the React canvas to the **new backend ATP fields**. Do not paste ML training code into the frontend.

---

## Prompt

You are integrating the CBTC dispatch UI (`frontend/`) with the FastAPI backend (`backend/main.py`). The backend already exposes:

- `GET /topology` — unchanged YUS map document
- `GET /state` — now includes per-train:
  - `atp_slack_m` (float, metres; negative = ATP tightening)
  - `authority_eoa_m` (float, chainage along loop)
  - `safe_zone_front` (derived from required gap + braking)
  - `safe_zone_rear` (train length, ~138 m)

### Goals

1. **Types** — Extend `frontend/src/types/domain.ts` train state with optional `atp_slack_m` and `authority_eoa_m`.
2. **Train layer** — In `TrainLayer`, visualize safe zone using `safe_zone_front` / `safe_zone_rear` along the edge polyline (already partially done); color-code when `atp_slack_m < 15` (amber) or `< 0` (red).
3. **Tooltip / InfoPopup** — On hover, show speed, slack, and EOA in human units (m, km/h).
4. **Events panel** — Optional: push a synthetic event when slack crosses below 0 (use `eventsStore`).
5. **Do not** change mock topology builders unless needed for typings; mock trains can fake `atp_slack_m: 50`.
6. **Polling** — Keep 200 ms `GET /state`; no WebSocket required for v1.

### Constraints

- No new dependencies unless necessary.
- Match existing dark dispatch styling (`constants/colors.ts`).
- Vitest: add one test that maps slack → color threshold.

### Acceptance

- With backend running (`cd backend && ./venv/bin/uvicorn main:app --reload`), live trains show tightening safe zones when convoy compresses.
- Mock mode still works when backend is down.

---

## Backend run reminder

```bash
cd backend
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
cd frontend && npm run dev
```

Vite proxies `/state` and `/topology` to port 8000 per `vite.config.ts`.

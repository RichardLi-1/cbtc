# CBTC simulator — project notes

**Last updated:** 2026-05-05

## Framing

Recreational / learning project: build a simplified **CBTC**-style system to understand movement authority, train protection, and how control layers interact with physics. Longer term, optional comparison of **classical optimal-control ATO** vs **reinforcement learning** (not “ML in general” as the core story).

**Geographic / operations context (starting point):** **Toronto transit** (TTC): use it for realistic names, distances, and “feel” of a first line configuration — still a **simulation**, not a certified or literal replica of any vendor system.

---

## Core entities (your model)

- **Lines** and **trains** are the primary world objects.
- **Controller** may update train-related **targets / commands** (e.g. ideal speed). Only the **train** mutates its own **speed** (and, by integration, position) in the simulation step.
- The **train** chooses its **throttle** (actuation). It does **not** have a map of the whole line; it only receives a **safe zone** / movement envelope: e.g. **permitted speed now**, and **how far forward and back** the safe region extends (CBTC movement authority and protection, simplified).

### Train command interface (narrow API)

External systems do **not** scatter writes across train fields. They deliver **one** command bundle per control update (or per tick, depending on how you structure the loop), and the train applies it together with physics and the safe zone.

**Who may send commands (typical case):**

| Source | Role |
|--------|------|
| **Controller** (wayside / line control) | Ongoing control: e.g. **direction** (changes rarely; **short turns** or **injected events** may flip it), **setpoints** the sim uses (e.g. target / ideal speed, mode requests — exact fields TBD as ATO/ATP harden). |
| **Driver** (human or scripted in the sim) | **Minimal** by design: mainly **emergency brake** (activate / release or latched, as you model it). Add other driver inputs only when you need them (e.g. door enable is often wayside-gated in reality; keep the list small). |

**Precedence:** While **emergency brake** is active, it **overrides** controller setpoints (and ATO-style traction demands if modeled separately) until released; the train applies **maximum braking** consistent with physics for that timestep.

**Why this shape:** only **controller** and **driver** “control” the train in the real mental model; everything else (CBTC limits, track) shows up as **constraints** and **state the train reads**, not as a third party poking the same fields. The narrow API makes that legible in code and keeps **speed/position** owned by the train’s integrator.

**Implementation note (later):** one function or struct (e.g. `apply_command(TrainCommand)`) is enough — “narrow” means **few fields and few call sites**, not a separate service.

---

## “Line” is not one responsibility

A line touches several concerns; treat them as **separate** even if they share a parent concept:

| Concern | Role |
|--------|------|
| **Geometry** | Exists as static structure: track, distances, stations, grades/curves as needed. Not “decided” at runtime except by configuration load. |
| **Operations** | Schedules, timetables, dwell, service patterns — **persisted** and **user-defined** via a **database** (or DB-backed config), not hardcoded in control logic. |
| **Control** | Runtime logic: zone control, movement authority, ATP-style limits, coordination — always active while the sim runs. |

---

## Safety

Safety is not necessarily a separate “box” in code forever, but conceptually it is **safe zones**: limits on where the train may go and how fast, derived from CBTC-style rules (simplified). The UI should be able to show this region per train.

---

## Replay and offline policy evaluation

For comparing **classical control / ATO** vs **RL** (and for debugging control logic without rerunning ad hoc sims), the intended tooling is:

- **Deterministic replay**: re-run a saved simulation episode from initial conditions and per-step seeds so failures reproduce exactly.
- **Step-level traces**: per timestep, log state, commanded action, reward terms, constraint / safety-check outcomes, and whether a **fallback controller** replaced an unsafe RL action.
- **Episode analytics**: aggregate metrics across many runs (delay, OTP-style punctuality, unsafe-action attempts, intervention rate) for **offline policy evaluation** over large batches of episodes (e.g. **1,000+** in a tight evaluation sweep).
- **Comparison mode**: replay the same scenario under two policies (or RL vs baseline) to diff behaviour at specific incidents.

Goal: turn “rerun until we reproduce the bug” into targeted triage — scrub to the failing timestep and see **why** the controller chose what it did. Quantitative impact (e.g. median minutes saved per incident) is something you measure once the tooling exists; resume-style numbers stay hypothetical until then.

---

## First milestones (backend)

### Physics

- Start with **stop-and-go** behaviour: acceleration and deceleration consistent with **traction/braking curves** (and track geometry such as **curves** affecting allowable speed or forces, as you model them).
- Integrate state over time with a fixed timestep (or adaptive later).

### Control / state

- First control milestone: **represent and store all train state on a line** (identity, position, speed, applied command, safe-zone snapshot or references, etc.) so the simulation and future UI/API can query it.

### What to defer or cut if scope must shrink

- **Reinforcement learning** is the most natural “late or optional” layer: classical ATO + sim + comparison story can ship without RL first.
- “Full ML” is not the immediate core; **RL** was called out as the first thing to drop under pressure, then re-add when the sim is trustworthy.

---

## Frontend (implemented v1 foundation)

- Stack: **React + TypeScript + Canvas** with layered renderer and viewport camera in local meter-space.
- Runtime model: backend-first by design, with automatic **mock fallback** when `/topology` is unreachable for UI-only work.
- Core layers shipped:
  - track geometry
  - occupied block overlays
  - switches / crossovers
  - signals (including blinking aspects)
  - trains with heading and safe-zone visual hints
  - labels
- Interaction shipped:
  - pan (drag), zoom-at-cursor (wheel), fit-to-bounds (double-click)
  - hover tooltips
  - click-to-command for switches/signals (manual control path)
- Operational HUD shipped:
  - clock
  - stale-data warning
  - error banner
  - mock mode badge
- Config panel scaffold shipped for rolling-stock profile and event-injection tuning (advanced panel toggle).

---

## Open design questions (current)

- Exact fields on `TrainCommand` beyond **direction**, **setpoints**, and **driver emergency brake** (e.g. ATO on/off, hold, door interlocks) — add only when the sim needs them.
- Exact split between “controller” vs “ATO” vs “ATP” modules (names matter less than **who may write what state**).
- How **operations DB** schema maps to **line geometry** IDs (stations, track segments).
- How much **Toronto** data is **realistic import** vs **placeholder** for v1.
- Exactly how safe-zone visuals should map to backend ATP authority primitives (currently visualized in frontend; authority logic still backend-owned).
- Final persistence shape for command overrides (for example signal manual overrides vs polling refresh semantics).

---

## Document purpose

This file records **your** architectural intent so implementation choices stay aligned. Update it when you change direction (e.g. when RL re-enters scope or when the first TTC line configuration is fixed).


This can also later be a tool to research how AI can act in traffic control environments
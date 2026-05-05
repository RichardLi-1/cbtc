# CBTC simulator — project notes

**Last updated:** 2026-05-04

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

## Frontend (intended)

- **Line overview:** entire line with **all trains** visible.
- **Drill-down:** zoom / focus on **one train** and visualize its **safe zone** (and relevant state).
- **User configuration:** **rolling stock** profiles — acceleration/deceleration curves, mass, and other parameters **editable by the user** (not only developer constants).

---

## Open design questions (to resolve as you implement)

- Exact fields on `TrainCommand` beyond **direction**, **setpoints**, and **driver emergency brake** (e.g. ATO on/off, hold, door interlocks) — add only when the sim needs them.
- Exact split between “controller” vs “ATO” vs “ATP” modules (names matter less than **who may write what state**).
- How **operations DB** schema maps to **line geometry** IDs (stations, track segments).
- How much **Toronto** data is **realistic import** vs **placeholder** for v1.

---

## Document purpose

This file records **your** architectural intent so implementation choices stay aligned. Update it when you change direction (e.g. when RL re-enters scope or when the first TTC line configuration is fixed).

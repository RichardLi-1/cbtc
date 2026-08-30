"""FastAPI surface: topology + live sim state + manual commands."""

from __future__ import annotations

import json
import math
import threading
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import commands as cmd_api
import signal_atc
import topology
import train
from events import registry as event_registry
from route_geom import ROUTE_LEN_M, chainage_to_edge
from stations import outbound_passenger_berths
from dispatch_live import live_dispatch
from sim import DT, simulation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_EDGES = {e["id"]: e for e in topology.YUS_TOPOLOGY["edges"]}


class SwitchCommandBody(BaseModel):
    state: str


class SignalCommandBody(BaseModel):
    aspect: str


class TrainDispatchBody(BaseModel):
    action: str  # hold | express | skip | release
    count: int = 1


class DispatchPolicyBody(BaseModel):
    mode: str  # rule | ppo


class SimControlBody(BaseModel):
    action: str | None = None  # "pause" | "resume"
    speed: float | None = None  # wall-clock multiplier, e.g. 2.0


class InjectEventBody(BaseModel):
    kind: str
    duration_s: float = 30.0
    starts_in_s: float = 0.0
    target_train_id: str | None = None
    target_signal_id: str | None = None
    target_switch_id: str | None = None
    speed_limit_kph: float | None = None
    note: str = ""


def _json_float(value: float | None) -> float | None:
    if value is None:
        return None
    if math.isinf(value) or math.isnan(value):
        return None
    return float(value)


# Spread initial roster around the loop
if train.lines and train.lines[0].trains:
    roster = train.lines[0].trains
    ato_berths = outbound_passenger_berths()
    n_berths = len(ato_berths)

    def _nearest_stop_index(chainage_m: float) -> int:
        if not ato_berths:
            return 0
        return min(
            range(len(ato_berths)),
            key=lambda idx: min(
                abs(chainage_m - ato_berths[idx].chainage_m),
                ROUTE_LEN_M - abs(chainage_m - ato_berths[idx].chainage_m),
            ),
        )

    # Offset initial roster by half a slot so train 0 isn't sitting on chainage 0
    # (which would permanently block the yard-clearance spawn check).
    for i, t in enumerate(roster):
        t.chainage_front_m = ROUTE_LEN_M * (i + 0.5) / max(len(roster), 1)
        t.speed = 25.0
        t.stop_index = _nearest_stop_index(t.chainage_front_m)
        t.dwell_remaining_sec = 0.0


def _sim_loop() -> None:
    while True:
        if not simulation.paused:
            simulation.step(DT)
        # speed=2.0 sleeps half as long, so the sim advances twice as fast.
        time.sleep(DT / max(simulation.speed, 0.1))


threading.Thread(target=_sim_loop, daemon=True).start()


@app.get("/health")
def health():
    return {"ok": True, "lines": len(train.lines)}


@app.get("/topology")
def get_topology():
    return topology.get_topology_document("YUS")


@app.get("/sim")
def get_sim():
    """Read simulation lifecycle: paused flag, speed multiplier, sim clock."""
    return {
        "paused": simulation.paused,
        "speed": simulation.speed,
        "sim_time_s": simulation._sim_time_s,
    }


@app.post("/sim/control")
def post_sim_control(body: SimControlBody):
    """Drive the simulation: pause, resume, or change the speed multiplier."""
    if body.action is not None:
        if body.action == "pause":
            simulation.paused = True
        elif body.action == "resume":
            simulation.paused = False
        else:
            raise HTTPException(status_code=400, detail="action must be 'pause' or 'resume'")
    if body.speed is not None:
        if body.speed <= 0:
            raise HTTPException(status_code=400, detail="speed must be > 0")
        simulation.speed = float(body.speed)
    return {"ok": True, "paused": simulation.paused, "speed": simulation.speed}


@app.post("/ops/dispatch/policy")
def post_dispatch_policy(body: DispatchPolicyBody):
    try:
        status = live_dispatch.set_mode(body.mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True, **status}


@app.get("/ops/dispatch/policy")
def get_dispatch_policy():
    return live_dispatch.status_payload()


@app.post("/commands/switch/{switch_id}")
def post_switch_command(switch_id: str, body: SwitchCommandBody):
    try:
        cmd_api.set_switch(switch_id, body.state)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "switch_id": switch_id, "state": body.state}


@app.post("/events/inject")
def post_inject_event(body: InjectEventBody):
    try:
        inc = event_registry.inject(
            lines=train.lines,
            kind=body.kind,
            sim_time_s=simulation._sim_time_s,
            duration_s=body.duration_s,
            starts_in_s=body.starts_in_s,
            target_train_id=body.target_train_id,
            target_signal_id=body.target_signal_id,
            target_switch_id=body.target_switch_id,
            speed_limit_kph=body.speed_limit_kph,
            note=body.note,
            source="manual",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "ok": True,
        "event": {
            "id": inc.id,
            "kind": inc.kind,
            "target_train_id": inc.target_train_id,
            "target_signal_id": inc.target_signal_id,
            "duration_s": inc.duration_s,
            "remaining_s": inc.remaining_s,
            "starts_in_s": inc.starts_in_s,
            "active": inc.active,
        },
    }


@app.delete("/events/{event_id}")
def delete_event(event_id: str):
    try:
        event_registry.cancel(event_id, lines=train.lines, sim_time_s=simulation._sim_time_s)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True}


@app.post("/commands/train/{train_id}")
def post_train_command(train_id: str, body: TrainDispatchBody):
    try:
        cmd_api.set_train_dispatch(train_id, body.action, body.count)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "train_id": train_id, "action": body.action, "count": body.count}


@app.post("/commands/signal/{signal_id}")
def post_signal_command(signal_id: str, body: SignalCommandBody):
    try:
        cmd_api.set_signal(signal_id, body.aspect)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True, "signal_id": signal_id, "aspect": body.aspect}


@app.get("/state")
def get_state():
    raw = json.loads(train.getState())

    trains_out = []
    for line_data in raw:
        for t in line_data["trains"]:
            eid, offset = chainage_to_edge(t["chainage_front_m"])
            speed_kph = float(t["speed"])
            speed_mps = speed_kph / 3.6
            brake_dist = (speed_mps**2) / (2.0 * 1.5)
            slack = _json_float(float(t.get("atp_slack_m") or 0.0))
            dwell = float(t.get("dwell_remaining_sec") or 0.0)
            if dwell > 0 or t.get("at_station_name"):
                run_state = "dwelling"
            elif speed_kph < 12.0:
                run_state = "arriving"
            else:
                run_state = "running"
            # Synthetic passenger load: morning peak rises, mid-day plateau, evening peak.
            # Deterministic per-train so the tooltip doesn't strobe between polls.
            run_num = int(t.get("run_number") or 0)
            tod = (simulation._sim_time_s % (12 * 3600)) / 3600.0  # 0..12h cycle
            peak = math.exp(-((tod - 2.0) ** 2) / 1.5) + 0.8 * math.exp(-((tod - 9.0) ** 2) / 2.0)
            base_load = 0.18 + 0.65 * min(1.0, peak)
            jitter = (math.sin(run_num * 1.7) + 1.0) * 0.06
            load_pct = max(0.0, min(1.0, base_load + jitter - 0.08))
            # Toronto Rocket capacity: ~1100 (seated + standees / 6-car consist).
            tr_capacity = 1100
            passengers = int(round(tr_capacity * load_pct))

            trains_out.append(
                {
                    "train_id": f"T{t['run_number']:02d}",
                    "label": f"Run {int(t['run_number'])}",
                    "edge_id": eid,
                    "offset": offset,
                    "speed": speed_mps,
                    "state": run_state,
                    "station_name": t.get("at_station_name") or None,
                    "dwell_remaining_sec": dwell,
                    "safe_zone_front": max(10.0 + brake_dist, float(t.get("required_gap_m", 0))),
                    "safe_zone_rear": float(t.get("length_m", 138.0)),
                    "atp_slack_m": slack,
                    "authority_eoa_m": _json_float(float(t["authority_eoa_m"])) if t.get("authority_eoa_m") is not None else None,
                    "fleet": "Bombardier TR",
                    "passengers": passengers,
                    "passenger_capacity": tr_capacity,
                    "load_pct": round(load_pct, 3),
                    "dispatch_hold": bool(t.get("op_hold")),
                    "dispatch_express": bool(t.get("op_express")),
                    "dispatch_skip_remaining": int(t.get("op_skip_remaining") or 0),
                }
            )

    occupied = {_EDGES[t["edge_id"]]["block_id"] for t in trains_out if t["edge_id"] in _EDGES}

    blocks = [
        {"block_id": bid, "occupancy": "occupied" if bid in occupied else "clear"}
        for bid in {e["block_id"] for e in topology.YUS_TOPOLOGY["edges"]}
    ]

    switches = [
        {"switch_id": sw["id"], "state": cmd_api.switch_state(sw["id"], sw["state"])}
        for sw in topology.YUS_TOPOLOGY["switches"]
    ]

    aspects = signal_atc.compute_aspects(occupied)
    signals = [
        {
            "signal_id": sig["id"],
            "aspect": cmd_api.signal_aspect(sig["id"], aspects.get(sig["id"], "green")),
        }
        for sig in topology.YUS_TOPOLOGY["signals"]
    ]

    line0 = train.lines[0] if train.lines else None
    dispatch = simulation.dispatch_status(line0) if line0 is not None else None

    ops: dict = {}
    if dispatch is not None:
        ops["dispatch"] = dispatch
    ops["injected_events"] = event_registry.active_payload()
    ops["event_log"] = event_registry.recent_log()

    return {
        "trains": trains_out,
        "blocks": blocks,
        "switches": switches,
        "signals": signals,
        "ops": ops,
        "sim_time_s": simulation._sim_time_s,
        "timestamp": time.time(),
    }

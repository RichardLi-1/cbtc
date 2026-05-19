"""FastAPI surface: topology + live sim state (no frontend coupling)."""

from __future__ import annotations

import json
import threading
import time

from fastapi import FastAPI

import topology
import train
from route_geom import ROUTE_LEN_M, chainage_to_edge
from stations import YUS_BERTHS
from sim import DT, simulation

app = FastAPI()

_EDGES = {e["id"]: e for e in topology.YUS_TOPOLOGY["edges"]}
_TRAIN_ROUTE = topology.YUS_TRAIN_ROUTE

# Spread initial roster around the loop at cruise
if train.lines and train.lines[0].trains:
    roster = train.lines[0].trains
    for i, t in enumerate(roster):
        t.chainage_front_m = ROUTE_LEN_M * i / max(len(roster), 1)
        t.speed = 25.0
        n_berths = len(YUS_BERTHS)
        t.stop_index = (i * max(n_berths // max(len(roster), 1), 1)) % max(n_berths, 1)
        t.dwell_remaining_sec = 0.0


def _sim_loop() -> None:
    while True:
        simulation.step(DT)
        time.sleep(DT)


threading.Thread(target=_sim_loop, daemon=True).start()


@app.get("/topology")
def get_topology():
    return topology.get_topology_document("YUS")


@app.get("/state")
def get_state():
    raw = json.loads(train.getState())

    trains_out = []
    for line_data in raw:
        for t in line_data["trains"]:
            eid, offset = chainage_to_edge(t["chainage_front_m"])
            # Sim stores speed in km/h; API contract (and frontend) use m/s like mock data.
            speed_kph = float(t["speed"])
            speed_mps = speed_kph / 3.6
            brake_dist = (speed_mps**2) / (2.0 * 1.5)
            slack = float(t.get("atp_slack_m") or 0.0)
            dwell = float(t.get("dwell_remaining_sec") or 0.0)
            if t.get("e_brake"):
                run_state = "running"
            elif dwell > 0:
                run_state = "dwelling"
            elif speed_kph < 15.0 and dwell == 0 and t.get("at_station_name") in (None, ""):
                run_state = "arriving"
            else:
                run_state = "running"
            trains_out.append(
                {
                    "train_id": f"T{t['run_number']:02d}",
                    "label": f"T{t['run_number']:02d}",
                    "edge_id": eid,
                    "offset": offset,
                    "speed": speed_mps,
                    "state": run_state,
                    "station_name": t.get("at_station_name") or None,
                    "dwell_remaining_sec": dwell,
                    "safe_zone_front": max(10.0 + brake_dist, float(t.get("required_gap_m", 0))),
                    "safe_zone_rear": float(t.get("length_m", 138.0)),
                    "atp_slack_m": slack,
                    "authority_eoa_m": t.get("authority_eoa_m"),
                }
            )

    occupied = {_EDGES[t["edge_id"]]["block_id"] for t in trains_out if t["edge_id"] in _EDGES}

    blocks = [
        {"block_id": bid, "occupancy": "occupied" if bid in occupied else "clear"}
        for bid in {e["block_id"] for e in topology.YUS_TOPOLOGY["edges"]}
    ]

    switches = [{"switch_id": sw["id"], "state": sw["state"]} for sw in topology.YUS_TOPOLOGY["switches"]]

    signals = []
    for sig in topology.YUS_TOPOLOGY["signals"]:
        eid = sig["edge_id"]
        idx = _TRAIN_ROUTE.index(eid) if eid in _TRAIN_ROUTE else -1
        next_bid = _EDGES[_TRAIN_ROUTE[(idx + 1) % len(_TRAIN_ROUTE)]]["block_id"] if idx >= 0 else ""
        own_bid = _EDGES.get(eid, {}).get("block_id", "")
        aspect = "red" if own_bid in occupied else ("yellow" if next_bid in occupied else "green")
        signals.append({"signal_id": sig["id"], "aspect": aspect})

    return {
        "trains": trains_out,
        "blocks": blocks,
        "switches": switches,
        "signals": signals,
        "timestamp": time.time(),
    }

"""Build training-compatible observations from backend live sim snapshots."""

from __future__ import annotations

import math

import numpy as np

from rlcbtc.envs.observation import OBS_DIM

KPH_TO_MPS = 1.0 / 3.6


def _forward_distance(from_m: float, to_m: float, route_len_m: float) -> float:
    d = (to_m - from_m) % route_len_m
    return d if d >= 0 else d + route_len_m


def _headways_sec(trains: list[dict], route_len_m: float) -> list[float]:
    if len(trains) < 2:
        return []
    ordered = sorted(trains, key=lambda t: float(t["chainage_front_m"]))
    out: list[float] = []
    for i, tr in enumerate(ordered):
        nxt = ordered[(i + 1) % len(ordered)]
        gap_m = _forward_distance(float(tr["chainage_front_m"]), float(nxt["chainage_front_m"]), route_len_m)
        v_mps = max(float(tr.get("speed_kph", 0.0)) * KPH_TO_MPS, 1.0)
        out.append(gap_m / v_mps)
    return out


def build_observation_from_snapshot(snapshot: dict) -> np.ndarray:
    trains = list(snapshot.get("trains") or [])
    route_len_m = float(snapshot.get("route_len_m", 97_300.0))
    headways = _headways_sec(trains, route_len_m)
    if len(headways) > 1:
        mean = sum(headways) / len(headways)
        var = sum((h - mean) ** 2 for h in headways) / len(headways)
        headway_std = math.sqrt(var)
    else:
        headway_std = 0.0

    roster = sorted(trains, key=lambda t: float(t["chainage_front_m"]))
    mean_speed = sum(float(t.get("speed_kph", 0.0)) for t in roster) / max(len(roster), 1)
    slacks = [float(t.get("atp_slack_m", 500.0)) for t in roster if math.isfinite(float(t.get("atp_slack_m", 500.0)))]
    mean_slack = sum(slacks) / max(len(slacks), 1) if slacks else 500.0
    min_slack = float(snapshot.get("min_slack_m", min(slacks) if slacks else 500.0))
    mean_delay = float(snapshot.get("mean_delay_sec", 0.0))
    violations = float(snapshot.get("violations", 0))
    hw_bias = float(snapshot.get("headway_bias_sec", 0.0))
    dwell_bias = float(snapshot.get("dwell_bias_sec", 0.0))
    sim_time = float(snapshot.get("sim_time_s", 0.0))

    feats = [
        mean_speed / 88.0,
        mean_slack / 500.0,
        headway_std / 120.0,
        mean_delay / 300.0,
        min_slack / 500.0,
        violations / 10.0,
        len(roster) / 12.0,
        hw_bias / 30.0,
        dwell_bias / 10.0,
        sim_time / 3600.0,
    ]
    for tr in roster[:3]:
        feats.extend(
            [
                float(tr.get("speed_kph", 0.0)) / 88.0,
                float(tr.get("atp_slack_m", 500.0)) / 500.0,
                float(tr.get("acceleration_level", 0.0)) / 3.0,
            ]
        )
    while len(feats) < OBS_DIM:
        feats.append(0.0)
    obs = np.asarray(feats[:OBS_DIM], dtype=np.float32)
    return np.nan_to_num(obs, nan=0.0, posinf=5.0, neginf=-5.0)


def shield_state_from_snapshot(snapshot: dict) -> dict:
    trains = snapshot.get("trains") or []
    speeds = [float(t.get("speed_kph", 0.0)) * KPH_TO_MPS for t in trains]
    return {
        "speed_mps": max(speeds) if speeds else 0.0,
        "min_slack_m": float(snapshot.get("min_slack_m", 500.0)),
        "yard_occupied": bool(snapshot.get("yard_occupied", False)),
    }

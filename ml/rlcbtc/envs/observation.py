"""Observation vector for dispatch policy (normalized features)."""

from __future__ import annotations

import math

import numpy as np

from rlcbtc.sim.sim_engine import SimEngine

OBS_DIM = 16


def _finite_slack_m(value: float, *, default_m: float = 500.0) -> float:
    if value is None or not math.isfinite(value):
        return default_m
    return float(value)


def build_observation(engine: SimEngine) -> np.ndarray:
    w = engine.world
    roster = sorted(w.trains.values(), key=lambda t: t.chainage_front_m)
    m = engine.last_metrics

    mean_speed = sum(t.speed_kph for t in roster) / max(len(roster), 1)
    slacks = [_finite_slack_m(t.atp_slack_m) for t in roster]
    mean_slack = sum(slacks) / max(len(slacks), 1)
    mean_delay = m.mean_delay_sec
    n_trains = float(len(roster))
    min_slack = _finite_slack_m(m.min_slack_m, default_m=min(slacks) if slacks else 500.0)

    feats = [
        mean_speed / 88.0,
        mean_slack / 500.0,
        m.headway_std_sec / 120.0,
        mean_delay / 300.0,
        min_slack / 500.0,
        float(m.violations) / 10.0,
        n_trains / 12.0,
        engine.headway_bias_sec / 30.0,
        engine.dwell_bias_sec / 10.0,
        w.sim_time_sec / 3600.0,
    ]
    for tr in roster[:3]:
        feats.extend(
            [
                tr.speed_kph / 88.0,
                _finite_slack_m(tr.atp_slack_m) / 500.0,
                tr.acceleration_level / 3.0,
            ]
        )
    while len(feats) < OBS_DIM:
        feats.append(0.0)
    obs = np.asarray(feats[:OBS_DIM], dtype=np.float32)
    return np.nan_to_num(obs, nan=0.0, posinf=5.0, neginf=-5.0)

"""Observation vector for dispatch policy (normalized features)."""

from __future__ import annotations

import numpy as np

from rlcbtc.sim.sim_engine import SimEngine

OBS_DIM = 16


def build_observation(engine: SimEngine) -> np.ndarray:
    w = engine.world
    roster = sorted(w.trains.values(), key=lambda t: t.chainage_front_m)
    m = engine.last_metrics

    mean_speed = sum(t.speed_kph for t in roster) / max(len(roster), 1)
    mean_slack = sum(t.atp_slack_m for t in roster) / max(len(roster), 1)
    mean_delay = m.mean_delay_sec
    n_trains = float(len(roster))

    feats = [
        mean_speed / 88.0,
        mean_slack / 500.0,
        m.headway_std_sec / 120.0,
        mean_delay / 300.0,
        m.min_slack_m / 500.0,
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
                tr.atp_slack_m / 500.0,
                tr.acceleration_level / 3.0,
            ]
        )
    while len(feats) < OBS_DIM:
        feats.append(0.0)
    return np.asarray(feats[:OBS_DIM], dtype=np.float32)

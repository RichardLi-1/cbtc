import numpy as np

from rlcbtc.envs.observation import OBS_DIM
from rlcbtc.live.backend_obs import build_observation_from_snapshot


def test_backend_obs_has_training_dim():
    snap = {
        "sim_time_s": 100.0,
        "route_len_m": 10_000.0,
        "trains": [
            {"chainage_front_m": 0.0, "speed_kph": 40.0, "atp_slack_m": 200.0, "acceleration_level": 2.0},
            {"chainage_front_m": 2000.0, "speed_kph": 35.0, "atp_slack_m": 150.0, "acceleration_level": 1.0},
        ],
        "yard_occupied": False,
        "min_slack_m": 150.0,
        "headway_bias_sec": 0.0,
        "dwell_bias_sec": 0.0,
    }
    obs = build_observation_from_snapshot(snap)
    assert obs.shape == (OBS_DIM,)
    assert np.all(np.isfinite(obs))

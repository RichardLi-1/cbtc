"""GET /state includes headway dispatch telemetry."""

import json

import train
from main import get_state
from sim import DT, simulation


def test_state_includes_dispatch_ops():
    line = train.lines[0]
    line.trains.clear()
    line.trains.append(train.Train(chainage_front_m=5000.0, run_number=0))

    simulation._sim_time_s = 0.0
    simulation._spawn_elapsed_s = 0.0
    simulation._dispatch_count = 0

    for _ in range(int(121 / DT)):
        simulation.step(DT)

    payload = get_state()
    dispatch = payload.get("ops", {}).get("dispatch")
    assert dispatch is not None
    assert dispatch["count"] >= 1
    assert "next_due_in_s" in dispatch
    assert payload.get("sim_time_s", 0) > 0

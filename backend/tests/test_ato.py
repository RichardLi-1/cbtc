"""ATO stops and dwells at berths."""

from ato import AtoController, AtoConfig
from route_geom import ROUTE_LEN_M
from sim import Simulation, DT
import train


def test_train_enters_dwell_near_berth():
    t = train.lines[0].trains[0]
    ato = AtoController(cfg=AtoConfig(dwell_sec=5.0))
    t.chainage_front_m = ato.target_berth(t).chainage_m - 5.0
    t.speed = 2.0
    t.dwell_remaining_sec = 0.0
    ato.apply_commands([t])
    assert t.dwell_remaining_sec > 0
    assert t.at_station_name


def test_overshoot_still_dwells():
    t = train.lines[0].trains[0]
    ato = AtoController(cfg=AtoConfig(dwell_sec=5.0))
    first = ato.berths[0]
    t.stop_index = 0
    t.chainage_front_m = (first.chainage_m + 50.0) % ROUTE_LEN_M
    t.speed = 18.0
    t.dwell_remaining_sec = 0.0
    ato.apply_commands([t])
    assert t.dwell_remaining_sec > 0
    assert t.at_station_name == first.name


def test_far_past_berth_skips_to_next_stop():
    t = train.lines[0].trains[0]
    ato = AtoController(cfg=AtoConfig(dwell_sec=5.0))
    first = ato.berths[0]
    t.stop_index = 0
    t.chainage_front_m = (first.chainage_m + 200.0) % ROUTE_LEN_M
    t.speed = 45.0
    t.dwell_remaining_sec = 0.0
    ato.apply_commands([t])
    assert t.dwell_remaining_sec == 0.0
    assert t.stop_index == 1


def test_leaving_first_station_does_not_immediate_dwell():
    t = train.lines[0].trains[0]
    ato = AtoController()
    # Real departures already advanced stop_index (see tick_dwell).
    t.chainage_front_m = 50.0
    t.speed = 0.0
    t.dwell_remaining_sec = 0.0
    t.stop_index = 1
    for _ in range(12):
        ato.apply_commands([t])
        t.step(0.5, ROUTE_LEN_M)
        ato.tick_dwell(t, 0.5)
        assert t.dwell_remaining_sec == 0.0
    assert t.speed > 5.0


def test_simulation_visits_many_stations():
    t = train.Train(chainage_front_m=0.0, direction=1, run_number=0)
    t.stop_index = 0
    t.speed = 20.0
    t.dwell_remaining_sec = 0.0
    sim = Simulation(lines=[train.Line("YUS", [t])])
    sim._maybe_spawn = lambda *_a, **_k: False
    visited: set[str] = set()
    for _ in range(8000):
        sim.step(DT)
        if t.dwell_remaining_sec >= 17.0 and t.at_station_name:
            visited.add(t.at_station_name)
    assert len(visited) >= 10

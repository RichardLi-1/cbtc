"""ATO stops and dwells at berths."""

from ato import AtoController, AtoConfig
from route_geom import ahead_of_berth_m, forward_distance, ROUTE_LEN_M
from sim import simulation, DT
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


def test_flyby_snaps_to_berth():
    t = train.lines[0].trains[0]
    ato = AtoController(cfg=AtoConfig(dwell_sec=5.0))
    berth = ato.target_berth(t)
    # 50 m past platform — forward_distance to berth is ~route_len - 50
    t.chainage_front_m = (berth.chainage_m + 50.0) % ROUTE_LEN_M
    t.speed = 45.0
    t.dwell_remaining_sec = 0.0
    dist = forward_distance(t.chainage_front_m, berth.chainage_m, ROUTE_LEN_M)
    assert dist > 1000.0
    assert ahead_of_berth_m(t.chainage_front_m, berth.chainage_m, ROUTE_LEN_M) > 40.0
    ato.apply_commands([t])
    assert t.dwell_remaining_sec > 0
    assert abs(t.chainage_front_m - berth.chainage_m) < 1.0


def test_simulation_visits_many_stations():
    t = train.lines[0].trains[0]
    t.stop_index = 0
    t.chainage_front_m = 0.0
    t.speed = 20.0
    t.dwell_remaining_sec = 0.0
    visited: set[str] = set()
    for _ in range(8000):
        simulation.step(DT)
        if t.dwell_remaining_sec >= 17.0 and t.at_station_name:
            visited.add(t.at_station_name)
    assert len(visited) >= 10

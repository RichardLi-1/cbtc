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


def test_passed_berth_at_speed_skips_to_next_stop():
    t = train.lines[0].trains[0]
    ato = AtoController(cfg=AtoConfig(dwell_sec=5.0))
    first = ato.target_berth(t)
    t.chainage_front_m = (first.chainage_m + 50.0) % ROUTE_LEN_M
    t.speed = 45.0
    t.dwell_remaining_sec = 0.0
    t.stop_index = 0
    ato.apply_commands([t])
    assert t.dwell_remaining_sec == 0.0
    assert t.stop_index == 1


def test_leaving_first_station_does_not_immediate_dwell():
    t = train.lines[0].trains[0]
    ato = AtoController()
    t.chainage_front_m = 50.0
    t.speed = 0.0
    t.dwell_remaining_sec = 0.0
    t.stop_index = 0
    for _ in range(12):
        ato.apply_commands([t])
        t.step(0.5, ROUTE_LEN_M)
        ato.tick_dwell(t, 0.5)
        assert t.dwell_remaining_sec == 0.0
    assert t.speed > 5.0


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

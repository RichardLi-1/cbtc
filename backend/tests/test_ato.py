"""ATO stops and dwells at berths."""

from ato import AtoController, AtoConfig
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


def test_simulation_cycles_dwell():
    t = train.lines[0].trains[0]
    berth = simulation.ato.target_berth(t)
    t.chainage_front_m = berth.chainage_m - 8.0
    t.speed = 2.0
    t.dwell_remaining_sec = 0.0
    simulation.step(DT)
    assert t.dwell_remaining_sec > 0 or t.speed < 5.0

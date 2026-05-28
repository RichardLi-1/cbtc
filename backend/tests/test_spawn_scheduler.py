"""Headway spawn adds trains when yard is clear."""

from sim import Simulation, DT
from train import Line, Train, TrainCommand
from route_geom import ROUTE_LEN_M


def _line_with_one_train_far() -> Line:
    t = Train(chainage_front_m=ROUTE_LEN_M * 0.5, run_number=0)
    t.apply_command(TrainCommand(1, 2.0))
    return Line("YUS", [t])


def test_spawn_adds_train_after_headway():
    sim = Simulation(lines=[_line_with_one_train_far()], route_len_m=ROUTE_LEN_M)
    line = sim.lines[0]
    start_n = len(line.trains)
    steps = int(121.0 / DT)
    for _ in range(steps):
        sim.step(DT)
    assert len(line.trains) >= start_n + 1


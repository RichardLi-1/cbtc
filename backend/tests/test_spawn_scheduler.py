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


def test_spawn_is_between_sheppard_west_and_wilson():
    from stations import outbound_passenger_berths
    from sim import SPAWN_CHAINAGE_M, SPAWN_STOP_INDEX

    berths = outbound_passenger_berths()
    sheppard = next(b.chainage_m for b in berths if b.name == "Sheppard West")
    wilson = next(b for b in berths if b.name == "Wilson")
    assert sheppard < SPAWN_CHAINAGE_M < wilson.chainage_m
    assert SPAWN_STOP_INDEX == next(i for i, b in enumerate(berths) if b.name == "Wilson")

    sim = Simulation(lines=[_line_with_one_train_far()], route_len_m=ROUTE_LEN_M)
    for _ in range(int(121.0 / DT)):
        sim.step(DT)
    spawned = [t for t in sim.lines[0].trains if t.run_number != 0]
    assert spawned
    assert sheppard < spawned[-1].chainage_front_m < wilson.chainage_m


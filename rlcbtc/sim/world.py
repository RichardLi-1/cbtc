from rlcbtc.sim.entities import TrainState


class World:
    def __init__(self) -> None:
        self.trains: dict[str, TrainState] = {}

    def step(self, dt_sec: int) -> None:
        for train in self.trains.values():
            train.position_m += train.speed_mps * dt_sec

from rlcbtc.sim.world import World


class SimEngine:
    def __init__(self, dt_sec: int = 1) -> None:
        self.dt_sec = dt_sec
        self.world = World()

    def tick(self) -> None:
        self.world.step(self.dt_sec)

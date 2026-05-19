"""Headway-based train insert (replaces backend ad-hoc dispatchTrain)."""

from __future__ import annotations

from rlcbtc.sim.world import World


class HeadwayScheduler:
    def __init__(self, target_headway_sec: float = 120.0, max_trains: int = 12) -> None:
        self.target_headway_sec = target_headway_sec
        self.max_trains = max_trains
        self._since_spawn_sec = 0.0

    def maybe_spawn(self, world: World, dt_sec: float, headway_bias_sec: float = 0.0) -> None:
        self._since_spawn_sec += dt_sec
        target = max(60.0, self.target_headway_sec + headway_bias_sec)
        if len(world.trains) >= self.max_trains:
            return
        if self._since_spawn_sec < target:
            return
        self._since_spawn_sec = 0.0
        tid = f"T{len(world.trains):02d}"
        world.add_train(tid, chainage_front_m=0.0, speed_kph=world.cruise_speed_kph * 0.5)

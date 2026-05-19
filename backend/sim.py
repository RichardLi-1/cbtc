"""Simulation orchestration: zone MA refresh then train physics (fixed dt)."""

from __future__ import annotations

from zone_controller import ZoneController
import train
from route_geom import ROUTE_LEN_M

DT = 0.5


class Simulation:
    def __init__(self, lines: list[train.Line] | None = None, route_len_m: float = ROUTE_LEN_M) -> None:
        self.lines = lines if lines is not None else train.lines
        self.route_len_m = route_len_m
        self.zone = ZoneController(route_len_m)

    def step(self, dt: float = DT) -> None:
        for line in self.lines:
            self.zone.update(line.trains)
            for t in line.trains:
                t.step(dt, self.route_len_m)


simulation = Simulation()

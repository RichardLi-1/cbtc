"""Simulation tick: physics + optional dispatch / dwell hooks."""

from __future__ import annotations

from rlcbtc.sim.scheduler import HeadwayScheduler
from rlcbtc.sim.world import World, WorldMetrics


class SimEngine:
    def __init__(
        self,
        dt_sec: float = 1.0,
        route_len_m: float = 97_300.0,
        num_trains: int = 6,
        target_headway_sec: float = 120.0,
    ) -> None:
        self.dt_sec = dt_sec
        self.world = World(
            route_len_m=route_len_m,
            num_trains=num_trains,
            target_headway_sec=target_headway_sec,
        )
        self.scheduler = HeadwayScheduler(target_headway_sec=target_headway_sec)
        self.headway_bias_sec = 0.0
        self.dwell_bias_sec = 0.0
        self.last_metrics = WorldMetrics()

    def refresh_authority(self) -> None:
        """Update ATP slack from current positions (no sim time advance)."""
        roster = list(self.world.trains.values())
        self.world.track.update_authority(roster)
        if roster:
            self.last_metrics.min_slack_m = min(t.atp_slack_m for t in roster)

    def apply_dispatch_action(self, action: list[float]) -> None:
        """Map normalized [-1,1] action vector to headway / dwell biases."""
        if len(action) >= 1:
            self.headway_bias_sec = float(action[0]) * 30.0
        if len(action) >= 2:
            self.dwell_bias_sec = float(action[1]) * 10.0

    def tick(self, notch_overrides: dict[str, float] | None = None) -> WorldMetrics:
        self.scheduler.maybe_spawn(self.world, self.dt_sec, self.headway_bias_sec)
        for tr in self.world.trains.values():
            if tr.dwell_remaining_sec > 0:
                tr.dwell_remaining_sec = max(0.0, tr.dwell_remaining_sec - self.dt_sec)
                tr.acceleration_level = -2.0
        self.last_metrics = self.world.step(self.dt_sec, notch_overrides)
        return self.last_metrics

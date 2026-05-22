"""Multi-train ring world for RL dispatch experiments."""

from __future__ import annotations

import statistics
from dataclasses import dataclass

from rlcbtc.sim.physics import KPH_TO_MPS, TrainPhysics
from rlcbtc.sim.timetable import TimetableTracker
from rlcbtc.sim.track import RingTrack, forward_distance, wrap_chainage


@dataclass
class WorldMetrics:
    headway_std_sec: float = 0.0
    mean_delay_sec: float = 0.0
    min_slack_m: float = float("inf")
    violations: int = 0


class World:
    def __init__(
        self,
        route_len_m: float = 97_300.0,
        num_trains: int = 6,
        target_headway_sec: float = 120.0,
        cruise_speed_kph: float = 55.0,
    ) -> None:
        self.track = RingTrack(route_len_m=route_len_m)
        self.route_len_m = route_len_m
        self.target_headway_sec = target_headway_sec
        self.cruise_speed_kph = cruise_speed_kph
        self.sim_time_sec = 0.0
        self.trains: dict[str, TrainPhysics] = {}
        self.timetable = TimetableTracker(
            self.track.station_chainages,
            route_len_m,
            cruise_speed_kph=cruise_speed_kph,
            service_headway_sec=target_headway_sec,
        )
        self._spawn_roster(num_trains)

    def _spawn_roster(self, n: int) -> None:
        self.trains.clear()
        for i in range(max(1, n)):
            s = (self.route_len_m * i / n) % self.route_len_m
            tid = f"T{i:02d}"
            tr = TrainPhysics(
                train_id=tid,
                chainage_front_m=s,
                speed_kph=self.cruise_speed_kph * 0.9,
                acceleration_level=2.0,
            )
            self.trains[tid] = tr
            self.timetable.init_train(tr, i, self.sim_time_sec)

    def add_train(self, train_id: str, chainage_front_m: float, speed_kph: float = 0.0) -> None:
        tr = TrainPhysics(
            train_id=train_id,
            chainage_front_m=wrap_chainage(chainage_front_m, self.route_len_m),
            speed_kph=speed_kph,
        )
        self.trains[train_id] = tr
        self.timetable.init_train(tr, len(self.trains) - 1, self.sim_time_sec)

    def step(self, dt_sec: float, notch_commands: dict[str, float] | None = None) -> WorldMetrics:
        self.sim_time_sec += dt_sec
        notch_commands = notch_commands or {}
        roster = list(self.trains.values())
        self.track.update_authority(roster)

        violations = 0
        min_slack = float("inf")
        for tr in roster:
            if tr.train_id in notch_commands:
                tr.acceleration_level = float(notch_commands[tr.train_id])
            tr.integrate(dt_sec, self.route_len_m)
            if tr.atp_slack_m < 0:
                violations += 1
            min_slack = min(min_slack, tr.atp_slack_m)

        if self.timetable is not None:
            self.timetable.update_all(roster, self.sim_time_sec)

        headways = self._headways_sec()
        hw_std = float(statistics.pstdev(headways)) if len(headways) > 1 else 0.0
        delays = [tr.schedule_delay_sec for tr in roster]
        mean_delay = sum(delays) / len(delays) if delays else 0.0
        return WorldMetrics(
            headway_std_sec=hw_std,
            mean_delay_sec=mean_delay,
            min_slack_m=min_slack,
            violations=violations,
        )

    def _headways_sec(self) -> list[float]:
        ordered = sorted(self.trains.values(), key=lambda t: t.chainage_front_m)
        out: list[float] = []
        for i, tr in enumerate(ordered):
            nxt = ordered[(i + 1) % len(ordered)]
            gap_m = forward_distance(tr.chainage_front_m, nxt.chainage_front_m, self.route_len_m)
            v_mps = max(tr.speed_kph * KPH_TO_MPS, 1.0)
            out.append(gap_m / v_mps)
        return out

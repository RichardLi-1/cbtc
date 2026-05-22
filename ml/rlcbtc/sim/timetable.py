"""Ideal timetable vs sim clock — drives per-train schedule_delay_sec."""

from __future__ import annotations

from rlcbtc.sim.physics import KPH_TO_MPS, TrainPhysics
from rlcbtc.sim.track import forward_distance

BASE_DWELL_SEC = 18.0
MIN_DWELL_SEC = 5.0
MAX_DWELL_SEC = 45.0
MAX_REPORTED_DELAY_SEC = 600.0


def effective_dwell_sec(base_dwell_sec: float, dwell_bias_sec: float) -> float:
    return max(MIN_DWELL_SEC, min(MAX_DWELL_SEC, base_dwell_sec + dwell_bias_sec))


class TimetableTracker:
    """Ring-line schedule: planned station pass times and lateness."""

    def __init__(
        self,
        station_chainages: list[float],
        route_len_m: float,
        cruise_speed_kph: float = 55.0,
        base_dwell_sec: float = BASE_DWELL_SEC,
        service_headway_sec: float = 120.0,
    ) -> None:
        self.station_chainages = list(station_chainages)
        self.route_len_m = route_len_m
        self.cruise_mps = max(cruise_speed_kph * KPH_TO_MPS, 1.0)
        self.base_dwell_sec = base_dwell_sec
        self.service_headway_sec = service_headway_sec
        self._segment_run_sec = self._build_segment_times()

    def _build_segment_times(self) -> list[float]:
        stations = self.station_chainages
        if len(stations) < 2:
            return [600.0]
        out: list[float] = []
        n = len(stations)
        for i in range(n):
            nxt = (i + 1) % n
            dist_m = forward_distance(stations[i], stations[nxt], self.route_len_m)
            run = dist_m / self.cruise_mps
            out.append(run + self.base_dwell_sec)
        return out

    def init_train(self, train: TrainPhysics, train_index: int, sim_time_sec: float) -> None:
        idx, dist_m = self._next_station_ahead(train.chainage_front_m, 0)
        run_sec = dist_m / self.cruise_mps
        phase = float(train_index) * (self.service_headway_sec / max(len(self.station_chainages), 1))
        train.next_station_idx = idx
        train.planned_arrival_sec = sim_time_sec + run_sec + phase

    def _cap_delay(self, raw: float) -> float:
        return max(0.0, min(MAX_REPORTED_DELAY_SEC, raw))

    def on_station_arrival(self, train: TrainPhysics, sim_time_sec: float, dwell_sec: float) -> None:
        """Call when train latches dwell at a platform."""
        train.schedule_delay_sec = self._cap_delay(sim_time_sec - train.planned_arrival_sec)
        idx = train.next_station_idx
        leg = self._segment_run_sec[idx % len(self._segment_run_sec)]
        nxt = (idx + 1) % len(self.station_chainages)
        train.next_station_idx = nxt
        train.planned_arrival_sec = sim_time_sec + dwell_sec + leg

    def update_enroute_delay(self, train: TrainPhysics, sim_time_sec: float) -> None:
        """Lateness vs next scheduled station pass (0 if still before planned time)."""
        if sim_time_sec <= train.planned_arrival_sec:
            train.schedule_delay_sec = 0.0
            return
        train.schedule_delay_sec = self._cap_delay(sim_time_sec - train.planned_arrival_sec)

    def update_all(self, trains: list[TrainPhysics], sim_time_sec: float) -> None:
        for tr in trains:
            self.update_enroute_delay(tr, sim_time_sec)

    def _next_station_ahead(self, chainage: float, start_idx: int) -> tuple[int, float]:
        stations = self.station_chainages
        if not stations:
            return 0, 0.0
        n = len(stations)
        best_idx = start_idx % n
        best_dist = forward_distance(chainage, stations[best_idx], self.route_len_m)
        for k in range(1, n):
            idx = (start_idx + k) % n
            d = forward_distance(chainage, stations[idx], self.route_len_m)
            if d < best_dist:
                best_dist = d
                best_idx = idx
        return best_idx, best_dist

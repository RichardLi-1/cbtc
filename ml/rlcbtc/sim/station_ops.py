"""Platform approach, dwell latch, and dwell_bias from dispatch."""

from __future__ import annotations

from rlcbtc.sim.physics import TrainPhysics
from rlcbtc.sim.timetable import TimetableTracker, effective_dwell_sec
from rlcbtc.sim.track import forward_distance
from rlcbtc.sim.world import World

STOP_TOLERANCE_M = 25.0
APPROACH_RADIUS_M = 500.0
CREEP_SPEED_KPH = 8.0
CRUISE_NOTCH = 2.0
BRAKE_NOTCH = -3.5


def apply_station_ops(world: World, dwell_bias_sec: float = 0.0) -> int:
    """ATO-style stops; returns count of dwell latches this tick."""
    latched = 0
    timetable: TimetableTracker | None = world.timetable
    base_dwell = timetable.base_dwell_sec if timetable else 18.0
    dwell_sec = effective_dwell_sec(base_dwell, dwell_bias_sec)

    for tr in world.trains.values():
        if tr.dwell_remaining_sec > 0:
            tr.speed_kph = 0.0
            tr.acceleration_level = 0.0
            continue

        idx, dist_m = _next_station_ahead(world, tr)
        tr.next_station_idx = idx

        if dist_m <= STOP_TOLERANCE_M and tr.speed_kph <= CREEP_SPEED_KPH + 2.0:
            tr.dwell_remaining_sec = dwell_sec
            tr.speed_kph = 0.0
            tr.acceleration_level = 0.0
            if timetable is not None:
                timetable.on_station_arrival(tr, world.sim_time_sec, dwell_sec)
            latched += 1
            continue

        if dist_m < APPROACH_RADIUS_M:
            tr.acceleration_level = BRAKE_NOTCH
        elif tr.atp_slack_m > 80.0:
            tr.acceleration_level = CRUISE_NOTCH

    return latched


def _next_station_ahead(world: World, train: TrainPhysics) -> tuple[int, float]:
    stations = world.track.station_chainages
    if not stations:
        return 0, float("inf")
    n = len(stations)
    start = getattr(train, "next_station_idx", 0) % n
    best_idx = start
    best_dist = forward_distance(train.chainage_front_m, stations[start], world.route_len_m)
    for k in range(1, n):
        idx = (start + k) % n
        d = forward_distance(train.chainage_front_m, stations[idx], world.route_len_m)
        if d < best_dist:
            best_dist = d
            best_idx = idx
    return best_idx, best_dist

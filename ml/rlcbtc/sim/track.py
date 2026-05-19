"""Ring track for dispatch research (meters, single direction)."""

from __future__ import annotations

URBALIS_MA_CYCLE_S = 0.5
URBALIS_FIXED_MARGIN_M = 10.0
URBALIS_GUARANTEED_DECEL_MPS2 = 1.5
KPH_TO_MPS = 1000.0 / 3600.0


def wrap_chainage(s: float, route_len_m: float) -> float:
    r = s % route_len_m
    return float(r + route_len_m if r < -1e-12 else r)


def forward_distance(chainage_from: float, chainage_to: float, route_len_m: float) -> float:
    a = wrap_chainage(chainage_from, route_len_m)
    b = wrap_chainage(chainage_to, route_len_m)
    d = b - a
    if d < 0:
        d += route_len_m
    return float(d)


def required_follower_gap_m(follower_speed_kph: float, leader_speed_kph: float) -> float:
    v_rear = follower_speed_kph * KPH_TO_MPS
    v_front = leader_speed_kph * KPH_TO_MPS
    a = URBALIS_GUARANTEED_DECEL_MPS2
    d_brake = (v_rear * v_rear) / (2.0 * a) if a > 0 else 0.0
    d_close = max(0.0, v_rear - v_front) * URBALIS_MA_CYCLE_S
    return URBALIS_FIXED_MARGIN_M + d_close + d_brake


class RingTrack:
    def __init__(self, route_len_m: float = 97_300.0, station_spacing_m: float = 800.0) -> None:
        self.route_len_m = route_len_m
        self.station_chainages = [
            wrap_chainage(i * station_spacing_m, route_len_m)
            for i in range(int(route_len_m // station_spacing_m) + 1)
        ]

    def update_authority(self, trains: list) -> None:
        """Attach MA fields (expects TrainPhysics-like objects)."""
        if not trains:
            return
        n = len(trains)
        order = sorted(range(n), key=lambda i: wrap_chainage(trains[i].chainage_front_m, self.route_len_m))
        for idx, i in enumerate(order):
            tr = trains[i]
            leader = trains[order[(idx + 1) % n]]
            leader_rear = wrap_chainage(leader.chainage_front_m - leader.length_m, self.route_len_m)
            gap = forward_distance(tr.chainage_front_m, leader_rear, self.route_len_m)
            req = required_follower_gap_m(tr.speed_kph, leader.speed_kph)
            tr.leader_id = leader.train_id
            tr.gap_to_leader_m = gap
            tr.required_gap_m = req
            tr.atp_slack_m = gap - req
            tr.authority_eoa_m = wrap_chainage(leader_rear - req, self.route_len_m)

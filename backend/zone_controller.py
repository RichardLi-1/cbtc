"""Wayside zone: assign movement authority along a single ring (simplified CBTC)."""

from __future__ import annotations

from typing import List, TYPE_CHECKING

from ma_constants import (
    KPH_TO_MPS,
    URBALIS_FIXED_MARGIN_M,
    URBALIS_GUARANTEED_DECEL_MPS2,
    URBALIS_MA_CYCLE_S,
)
from route_geom import ROUTE_LEN_M, forward_distance, wrap_chainage

if TYPE_CHECKING:
    from train import Train


def required_follower_gap_m(follower_speed_kph: float, leader_speed_kph: float) -> float:
    """Minimum forward distance from follower nose to leader tail (m)."""
    v_rear_mps = follower_speed_kph * KPH_TO_MPS
    v_front_mps = leader_speed_kph * KPH_TO_MPS
    a = URBALIS_GUARANTEED_DECEL_MPS2
    d_brake_rear = (v_rear_mps * v_rear_mps) / (2.0 * a) if a > 0 else 0.0
    d_close = max(0.0, v_rear_mps - v_front_mps) * URBALIS_MA_CYCLE_S
    return URBALIS_FIXED_MARGIN_M + d_close + d_brake_rear


class ZoneController:
    """Single-line moving-block style zone: every train gets a leader on the ring."""

    def __init__(self, route_len_m: float = ROUTE_LEN_M) -> None:
        self.route_len_m = route_len_m

    def update(self, trains: List["Train"]) -> None:
        """Sort by nose chainage, compute gap / required separation / slack; sets ATP fields on trains."""
        if not trains:
            return

        n = len(trains)
        order = sorted(range(n), key=lambda i: wrap_chainage(trains[i].chainage_front_m, self.route_len_m))

        for idx, i in enumerate(order):
            train = trains[i]
            leader_idx = order[(idx + 1) % n]
            leader = trains[leader_idx]

            leader_rear = wrap_chainage(leader.chainage_front_m - leader.length_m, self.route_len_m)
            gap = forward_distance(train.chainage_front_m, leader_rear, self.route_len_m)
            req = required_follower_gap_m(train.speed, leader.speed)
            slack = gap - req
            eoa = wrap_chainage(leader_rear - req, self.route_len_m)

            train.leader_run_number = leader.run_number
            train.gap_to_leader_m = gap
            train.required_gap_m = req
            train.atp_slack_m = slack
            train.authority_eoa_m = eoa

"""Train dynamics aligned with backend/ma_constants (Toronto Rocket sketch)."""

from __future__ import annotations

import math
from bisect import bisect_right
from dataclasses import dataclass, field

SERVICE_DECEL_MPS2 = 1.35
EMERGENCY_DECEL_MPS2 = 1.5
KPH_TO_MPS = 1000.0 / 3600.0
MPS_TO_KPH = 3600.0 / 1000.0

TR_ACCELERATION_CURVE = [
    (0, 0.8),
    (10, 0.8),
    (20, 0.75),
    (30, 0.6),
    (40, 0.5),
    (50, 0.4),
    (60, 0.3),
    (70, 0.2),
    (80, 0.1),
    (88, 0.05),
]


@dataclass
class TrainPhysics:
    train_id: str
    chainage_front_m: float
    length_m: float = 138.0
    speed_kph: float = 0.0
    direction: int = 1
    acceleration_level: float = 0.0
    e_brake: bool = False
    acceleration_mps2: float = 0.0

    leader_id: str | None = None
    gap_to_leader_m: float = 0.0
    required_gap_m: float = 0.0
    atp_slack_m: float = float("inf")
    authority_eoa_m: float = 0.0

    schedule_delay_sec: float = 0.0
    planned_arrival_sec: float = 0.0
    next_station_idx: int = 0
    dwell_remaining_sec: float = 0.0

    acceleration_curve: list[tuple[float, float]] = field(default_factory=lambda: list(TR_ACCELERATION_CURVE))

    def traction_accel(self) -> float:
        lvl = self.acceleration_level
        if self.direction < 0:
            lvl = -lvl
        if lvl < 0:
            return -SERVICE_DECEL_MPS2 * min(1.0, abs(lvl) / 5.0)
        speeds = [s for s, _ in self.acceleration_curve]
        x0 = bisect_right(speeds, self.speed_kph) - 1
        x1 = x0 + 1 if x0 < len(speeds) - 1 else x0
        if x0 == x1:
            base = 0.0
        else:
            s0, s1 = speeds[x0], speeds[x1]
            fx0, fx1 = self.acceleration_curve[x0][1], self.acceleration_curve[x1][1]
            base = fx0 + ((fx1 - fx0) / (s1 - s0)) * (self.speed_kph - s0)
        return base * min(1.0, lvl / 3.0)

    def atp_accel_cap(self) -> float:
        slack = self.atp_slack_m
        if slack is None or math.isinf(slack):
            return float("inf")
        v_mps = abs(self.speed_kph) * KPH_TO_MPS
        if slack <= 0:
            return -EMERGENCY_DECEL_MPS2
        br = (v_mps * v_mps) / (2.0 * EMERGENCY_DECEL_MPS2) if EMERGENCY_DECEL_MPS2 > 0 else 0.0
        if slack < br + 2.0:
            return -EMERGENCY_DECEL_MPS2
        if slack < br + 15.0:
            return -SERVICE_DECEL_MPS2
        return float("inf")

    def integrate(self, dt: float, route_len_m: float) -> None:
        if dt <= 0:
            return
        if self.dwell_remaining_sec > 0:
            self.dwell_remaining_sec = max(0.0, self.dwell_remaining_sec - dt)
            self.speed_kph = 0.0
            self.acceleration_mps2 = 0.0
            return
        v_mps = self.speed_kph * KPH_TO_MPS * self.direction
        if self.e_brake:
            a = -EMERGENCY_DECEL_MPS2 * (1 if self.direction >= 0 else -1)
        else:
            a_cmd = self.traction_accel()
            cap = self.atp_accel_cap()
            a = min(a_cmd, cap) if math.isfinite(cap) and cap < a_cmd else a_cmd
        self.acceleration_mps2 = float(a)
        v_next = v_mps + a * dt
        if self.direction >= 0 and v_next < 0:
            v_next = 0.0
        if self.direction < 0 and v_next > 0:
            v_next = 0.0
        v_avg = 0.5 * (v_mps + v_next)
        self.chainage_front_m = (self.chainage_front_m + v_avg * dt * self.direction) % route_len_m
        self.speed_kph = abs(v_next) * MPS_TO_KPH

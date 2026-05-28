"""Train, line, and JSON state — single-line ring with ATP-aware integration."""

from __future__ import annotations

import json
import math
from bisect import bisect_right
from dataclasses import dataclass
from typing import Any


def _json_safe(obj):
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    return obj


from ma_constants import (
    EMERGENCY_DECEL_MPS2,
    KPH_TO_MPS,
    MPS_TO_KPH,
    SERVICE_DECEL_MPS2,
    URBALIS_FIXED_MARGIN_M,
    URBALIS_GUARANTEED_DECEL_MPS2,
    URBALIS_MA_CYCLE_S,
)
from route_geom import ROUTE_LEN_M, wrap_chainage

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
class TrainCommand:
    direction: int
    acceleration_level: float
    e_brake: bool = False


class Train:
    """Kinematic train on a ring: nose chainage, length, traction curve, ATP slack from zone."""

    def __init__(
        self,
        chainage_front_m: float = 0.0,
        direction: int = 1,
        run_number: int | None = None,
        length_m: float = 138.0,
    ) -> None:
        self.chainage_front_m = float(chainage_front_m)
        self.length_m = float(length_m)
        self.speed = 0.0  # kph
        self.acceleration_level = 0.0
        self.acceleration = 0.0  # m/s^2 (signed)
        self.direction = direction
        self.e_brake = False
        self.run_number = run_number
        self.acceleration_curve = TR_ACCELERATION_CURVE

        self.leader_run_number: int | None = None
        self.gap_to_leader_m: float = 0.0
        self.required_gap_m: float = 0.0
        self.atp_slack_m: float = float("inf")
        self.authority_eoa_m: float = 0.0

        self.stop_index: int = 0
        self.dwell_remaining_sec: float = 0.0
        self.at_station_name: str = ""

        # Operator overrides (set via /commands/train/{id}/...)
        self._op_hold: bool = False           # block dwell-release at next/current station
        self._op_skip_remaining: int = 0      # cruise through this many upcoming station dwells
        self._op_express: bool = False        # cruise through every dwell until cleared

    @property
    def position(self) -> float:
        """Backward-compat: nose chainage (m) along the loop."""
        return self.chainage_front_m

    @position.setter
    def position(self, value: float) -> None:
        self.chainage_front_m = float(value)

    def apply_command(self, command: TrainCommand) -> None:
        self.direction = int(command.direction)
        self.e_brake = bool(command.e_brake)
        self.acceleration_level = float(command.acceleration_level)

    def _traction_accel(self) -> float:
        """Signed acceleration from notch (positive = traction along direction)."""
        lvl = self.acceleration_level
        if self.direction < 0:
            lvl = -lvl

        if lvl < 0:
            return -SERVICE_DECEL_MPS2 * min(1.0, abs(lvl) / 5.0)

        speeds = [s for s, _ in self.acceleration_curve]
        x0 = bisect_right(speeds, self.speed) - 1
        x1 = x0 + 1 if x0 < len(speeds) - 1 else x0
        if x0 == x1:
            base = 0.0
        else:
            s0, s1 = speeds[x0], speeds[x1]
            fx0, fx1 = self.acceleration_curve[x0][1], self.acceleration_curve[x1][1]
            base = fx0 + ((fx1 - fx0) / (s1 - s0)) * (self.speed - s0)
        return base * min(1.0, lvl / 3.0)

    def _atp_accel_cap(self) -> float:
        """Returns a finite acceleration cap when ATP demands deceleration (max() with caps)."""
        slack = getattr(self, "atp_slack_m", float("inf"))
        if slack is None or math.isinf(slack):
            return float("inf")
        v_mps = abs(self.speed) * KPH_TO_MPS
        if slack <= 0:
            return -EMERGENCY_DECEL_MPS2
        br = (v_mps * v_mps) / (2.0 * EMERGENCY_DECEL_MPS2) if EMERGENCY_DECEL_MPS2 > 0 else 0.0
        if slack < br + 2.0:
            return -EMERGENCY_DECEL_MPS2
        if slack < br + 15.0:
            return -SERVICE_DECEL_MPS2
        return float("inf")

    def step(self, dt: float, route_len: float = ROUTE_LEN_M) -> None:
        if dt <= 0:
            return

        if self.dwell_remaining_sec > 0:
            self.speed = 0.0
            self.acceleration = 0.0
            return

        v_mps = self.speed * KPH_TO_MPS * self.direction

        if self.e_brake:
            a = -EMERGENCY_DECEL_MPS2 * (1 if self.direction >= 0 else -1)
        else:
            a_cmd = self._traction_accel()
            cap = self._atp_accel_cap()
            if math.isfinite(cap):
                a = min(a_cmd, cap) if cap < a_cmd else a_cmd
            else:
                a = a_cmd

        self.acceleration = float(a)
        v_mps_next = v_mps + self.acceleration * dt
        if self.direction >= 0 and v_mps_next < 0:
            v_mps_next = 0.0
        if self.direction < 0 and v_mps_next > 0:
            v_mps_next = 0.0

        v_avg = 0.5 * (v_mps + v_mps_next)
        self.chainage_front_m = wrap_chainage(self.chainage_front_m + v_avg * dt, route_len)
        self.speed = abs(v_mps_next) * MPS_TO_KPH
        cap_kph = getattr(self, "_speed_cap_kph", None)
        if cap_kph is not None and self.speed > float(cap_kph):
            self.speed = float(cap_kph)


class Line:
    def __init__(self, name: str, trains: list[Train]) -> None:
        self.name = name
        self.trains = trains


def _make_initial_roster(route_len: float, num_trains: int = 16) -> list[Train]:
    trains: list[Train] = []
    n = max(1, num_trains)
    for i in range(n):
        s = (route_len * i / n) % route_len
        t = Train(chainage_front_m=s, direction=1, run_number=i, length_m=138.0)
        t.apply_command(TrainCommand(direction=1, acceleration_level=2.0, e_brake=False))
        trains.append(t)
    return trains


def getState() -> str:
    states = []
    for line in lines:
        line_obj: dict[str, Any] = {
            "name": line.name,
            "trains": [
                {
                    "chainage_front_m": train.chainage_front_m,
                    "position": train.chainage_front_m,
                    "length_m": train.length_m,
                    "speed": train.speed,
                    "acceleration": train.acceleration,
                    "acceleration_level": train.acceleration_level,
                    "direction": train.direction,
                    "e_brake": train.e_brake,
                    "run_number": train.run_number,
                    "leader_run_number": train.leader_run_number,
                    "gap_to_leader_m": train.gap_to_leader_m,
                    "required_gap_m": train.required_gap_m,
                    "atp_slack_m": train.atp_slack_m,
                    "authority_eoa_m": train.authority_eoa_m,
                    "dwell_remaining_sec": train.dwell_remaining_sec,
                    "at_station_name": train.at_station_name,
                    "stop_index": train.stop_index,
                }
                for train in line.trains
            ],
        }
        states.append(line_obj)
    return json.dumps(_json_safe(states))


def _default_line() -> Line:
    return Line("YUS", _make_initial_roster(ROUTE_LEN_M, num_trains=16))


lines: list[Line] = [_default_line()]

if __name__ == "__main__":
    from sim import DT, simulation

    for _ in range(100000):
        simulation.step(DT)

"""Wayside ATO: cruise, brake for berth, dwell, then continue (per train)."""

from __future__ import annotations

from dataclasses import dataclass

from ma_constants import KPH_TO_MPS, SERVICE_DECEL_MPS2
from route_geom import forward_distance
from stations import StationBerth, YUS_BERTHS
from train import Train, TrainCommand

# Tunables (operations layer — later from DB / config).
DEFAULT_DWELL_SEC = 18.0
STOP_TOLERANCE_M = 15.0
CREEP_SPEED_KPH = 4.0
APPROACH_RADIUS_M = 700.0
APPROACH_SPEED_KPH = 40.0
CRUISE_NOTCH = 2.0
BRAKE_NOTCH = -3.5


@dataclass
class AtoConfig:
    dwell_sec: float = DEFAULT_DWELL_SEC
    stop_tolerance_m: float = STOP_TOLERANCE_M
    cruise_notch: float = CRUISE_NOTCH


def _brake_distance_m(speed_kph: float) -> float:
    v = speed_kph * KPH_TO_MPS
    return (v * v) / (2.0 * SERVICE_DECEL_MPS2) if SERVICE_DECEL_MPS2 > 0 else 0.0


class AtoController:
    def __init__(
        self,
        berths: list[StationBerth] | None = None,
        route_len_m: float | None = None,
        cfg: AtoConfig | None = None,
    ) -> None:
        self.berths = berths if berths is not None else YUS_BERTHS
        self.route_len_m = route_len_m if route_len_m is not None else _route_len_from_berths()
        self.cfg = cfg or AtoConfig()

    def ensure_train_state(self, train: Train) -> None:
        if not hasattr(train, "stop_index"):
            # Stagger targets so four trains don't share the same berth.
            n = len(self.berths)
            train.stop_index = (train.run_number or 0) * (n // 4) % max(n, 1)
        if not hasattr(train, "dwell_remaining_sec"):
            train.dwell_remaining_sec = 0.0
        if not hasattr(train, "at_station_name"):
            train.at_station_name = ""
        if not hasattr(train, "_ato_dist_to_berth_m"):
            train._ato_dist_to_berth_m = float("inf")

    def target_berth(self, train: Train) -> StationBerth:
        return self.berths[train.stop_index % len(self.berths)]

    def apply_commands(self, trains: list[Train]) -> None:
        for tr in trains:
            self.ensure_train_state(tr)
            cmd = self._command_for(tr)
            tr.apply_command(cmd)

    def _command_for(self, train: Train) -> TrainCommand:
        if train.e_brake:
            return TrainCommand(train.direction, 0.0, e_brake=True)

        if train.dwell_remaining_sec > 0:
            return TrainCommand(train.direction, 0.0, e_brake=False)

        berth = self.target_berth(train)
        dist = forward_distance(train.chainage_front_m, berth.chainage_m, self.route_len_m)
        v = train.speed
        prev_dist = float(train._ato_dist_to_berth_m)
        train._ato_dist_to_berth_m = dist

        # Overshot platform: target next station on the loop.
        if prev_dist < 80.0 and dist > prev_dist + 20.0 and v > 15.0:
            train.stop_index = (train.stop_index + 1) % len(self.berths)
            berth = self.target_berth(train)
            dist = forward_distance(train.chainage_front_m, berth.chainage_m, self.route_len_m)
            train._ato_dist_to_berth_m = dist

        capture = self.cfg.stop_tolerance_m + max(v * KPH_TO_MPS * 0.6, 8.0)

        # At platform: latch dwell once slow enough and inside capture envelope.
        if dist <= capture and v <= CREEP_SPEED_KPH * 2.5:
            train.dwell_remaining_sec = self.cfg.dwell_sec
            train.at_station_name = berth.name
            train.speed = 0.0
            train.chainage_front_m = berth.chainage_m
            return TrainCommand(train.direction, 0.0, e_brake=False)

        brake_dist = _brake_distance_m(v)
        margin = 30.0

        if dist <= brake_dist + margin:
            # Service brake — stronger as we get closer.
            if dist <= brake_dist + 5.0:
                notch = BRAKE_NOTCH
            elif dist <= brake_dist + 15.0:
                notch = -2.5
            else:
                notch = -1.5
            return TrainCommand(train.direction, notch, e_brake=False)

        if dist < APPROACH_RADIUS_M:
            if v > APPROACH_SPEED_KPH:
                return TrainCommand(train.direction, -1.0, e_brake=False)
            if dist < 250.0 and v > 22.0:
                return TrainCommand(train.direction, -2.0, e_brake=False)

        return TrainCommand(train.direction, self.cfg.cruise_notch, e_brake=False)

    def tick_dwell(self, train: Train, dt: float) -> None:
        """Call after physics step to advance dwell timer and release to next station."""
        if train.dwell_remaining_sec <= 0:
            return
        train.dwell_remaining_sec = max(0.0, train.dwell_remaining_sec - dt)
        train.speed = 0.0
        if train.dwell_remaining_sec <= 0:
            train.stop_index = (train.stop_index + 1) % len(self.berths)
            train.at_station_name = ""


def _route_len_from_berths() -> float:
    from route_geom import ROUTE_LEN_M

    return ROUTE_LEN_M

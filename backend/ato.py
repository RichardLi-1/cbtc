"""Wayside ATO: cruise, brake for berth, dwell, then continue (per train)."""

from __future__ import annotations

from dataclasses import dataclass

from ma_constants import KPH_TO_MPS, SERVICE_DECEL_MPS2
from route_geom import ROUTE_LEN_M, berth_approach, forward_distance
from stations import StationBerth, YUS_BERTHS, outbound_passenger_berths
from train import Train, TrainCommand

DEFAULT_DWELL_SEC = 18.0
STOP_TOLERANCE_M = 20.0
CREEP_SPEED_KPH = 12.0
APPROACH_RADIUS_M = 550.0
APPROACH_SPEED_KPH = 35.0
# Still at the platform if the nose just overshot (ATP / late brake).
# After a real dwell, stop_index already points at the *next* berth, so this
# does not re-dwell on departure.
PLATFORM_PAST_M = 120.0
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
        self.berths = berths if berths is not None else outbound_passenger_berths()
        self.route_len_m = route_len_m if route_len_m is not None else ROUTE_LEN_M
        self.cfg = cfg or AtoConfig()

    def ensure_train_state(self, train: Train) -> None:
        if not hasattr(train, "stop_index"):
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

    def _should_skip(self, train: Train) -> bool:
        """Operator told this train to run non-stop (express) or skip the next stop(s)."""
        return bool(getattr(train, "_op_express", False)) or int(getattr(train, "_op_skip_remaining", 0)) > 0

    def _count_skip(self, train: Train) -> None:
        """Consume one skip as the train passes a berth; express keeps skipping forever."""
        if not getattr(train, "_op_express", False):
            train._op_skip_remaining = max(0, int(getattr(train, "_op_skip_remaining", 0)) - 1)

    def apply_commands(self, trains: list[Train]) -> None:
        for tr in trains:
            self.ensure_train_state(tr)
            tr.apply_command(self._command_for(tr))

    def _latch_dwell(self, train: Train, berth: StationBerth) -> TrainCommand:
        train.dwell_remaining_sec = self.cfg.dwell_sec
        train.at_station_name = berth.name
        train.speed = 0.0
        # Keep current chainage to avoid visible teleport on the map.
        dist, _ = berth_approach(train.chainage_front_m, berth.chainage_m, self.route_len_m)
        train._ato_dist_to_berth_m = dist
        return TrainCommand(train.direction, 0.0, e_brake=False)

    def _command_for(self, train: Train) -> TrainCommand:
        if train.e_brake:
            return TrainCommand(train.direction, 0.0, e_brake=True)

        if train.dwell_remaining_sec > 0:
            return TrainCommand(train.direction, 0.0, e_brake=False)

        berth = self.target_berth(train)
        dist, ahead = berth_approach(train.chainage_front_m, berth.chainage_m, self.route_len_m)
        v = train.speed

        # Already passed this berth — dwell if we're still on the platform;
        # otherwise this stop is gone, aim at the next one.
        if ahead > self.cfg.stop_tolerance_m:
            if not self._should_skip(train) and ahead <= PLATFORM_PAST_M:
                return self._latch_dwell(train, berth)
            if self._should_skip(train):
                self._count_skip(train)
            train.stop_index = (train.stop_index + 1) % len(self.berths)
            berth = self.target_berth(train)
            dist, ahead = berth_approach(train.chainage_front_m, berth.chainage_m, self.route_len_m)

        train._ato_dist_to_berth_m = dist

        # Operator express / skip: cruise straight through this berth. ATP slack
        # (train._atp_accel_cap) still protects against the leader, so this is safe.
        if self._should_skip(train):
            return TrainCommand(train.direction, self.cfg.cruise_notch, e_brake=False)

        # Capture window — bigger floor so a train that braked early still latches.
        capture = self.cfg.stop_tolerance_m + max(v * KPH_TO_MPS * 0.4, 12.0)

        if ahead == 0.0 and dist <= capture and v <= CREEP_SPEED_KPH:
            return self._latch_dwell(train, berth)

        brake_dist = _brake_distance_m(v)
        margin = 40.0

        if ahead == 0.0 and dist <= brake_dist + margin:
            if dist <= brake_dist + 8.0:
                notch = BRAKE_NOTCH
            elif dist <= brake_dist + 20.0:
                notch = -2.8
            else:
                notch = -2.0
            return TrainCommand(train.direction, notch, e_brake=False)

        if ahead == 0.0 and dist < APPROACH_RADIUS_M:
            if v > APPROACH_SPEED_KPH:
                return TrainCommand(train.direction, -1.5, e_brake=False)
            if dist < 300.0 and v > 20.0:
                return TrainCommand(train.direction, -2.5, e_brake=False)

        return TrainCommand(train.direction, self.cfg.cruise_notch, e_brake=False)

    def tick_dwell(self, train: Train, dt: float) -> None:
        if train.dwell_remaining_sec <= 0:
            return
        held = (
            getattr(train, "_station_hold", False)
            or getattr(train, "_door_interlock", False)
            or getattr(train, "_op_hold", False)
        )
        if held:
            train.dwell_remaining_sec = max(train.dwell_remaining_sec, dt)
        else:
            train.dwell_remaining_sec = max(0.0, train.dwell_remaining_sec - dt)
        train.speed = 0.0
        if train.dwell_remaining_sec <= 0 and not held:
            train.stop_index = (train.stop_index + 1) % len(self.berths)
            train.at_station_name = ""
            train._ato_dist_to_berth_m = float("inf")

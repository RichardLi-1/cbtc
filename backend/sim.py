"""Simulation orchestration: zone MA → ATO commands → train physics."""

from __future__ import annotations

from ato import AtoController
from dispatch_live import live_dispatch
from events import registry as event_registry
from stations import outbound_passenger_berths
from zone_controller import ZoneController
import train
from route_geom import ROUTE_LEN_M, forward_distance

DT = 0.5
SPAWN_HEADWAY_S = 120.0
SPAWN_MAX_TRAINS = 24
SPAWN_CLEARANCE_M = 250.0


def _wilson_yard_chainage() -> tuple[float, int]:
    """Wilson Yard sits between Sheppard West and Wilson. Return (chainage, next stop_index)."""
    berths = outbound_passenger_berths()
    by_name = {b.name: (b.chainage_m, i) for i, b in enumerate(berths)}
    sheppard = by_name["Sheppard West"][0]
    wilson_ch, wilson_idx = by_name["Wilson"]
    return (sheppard + wilson_ch) / 2.0, wilson_idx


SPAWN_CHAINAGE_M, SPAWN_STOP_INDEX = _wilson_yard_chainage()


class Simulation:
    def __init__(self, lines: list[train.Line] | None = None, route_len_m: float = ROUTE_LEN_M) -> None:
        self.lines = lines if lines is not None else train.lines
        self.route_len_m = route_len_m
        self.zone = ZoneController(route_len_m)
        self.ato = AtoController(route_len_m=route_len_m)
        self._spawn_elapsed_s = 0.0
        self._sim_time_s = 0.0
        self._dispatch_count = 0
        self._last_dispatch_s: float | None = None
        self._last_dispatch_blocked = False
        # Lifecycle control so the sim can be driven over the API.
        self.paused = False
        self.speed = 1.0  # wall-clock multiplier: 2.0 = twice as fast

    def _yard_occupied(self, line: train.Line) -> bool:
        for tr in line.trains:
            gap = forward_distance(SPAWN_CHAINAGE_M, tr.chainage_front_m, self.route_len_m)
            if gap < SPAWN_CLEARANCE_M:
                return True
        return False

    def _maybe_spawn(self, line: train.Line, dt: float) -> bool:
        self._spawn_elapsed_s += dt
        if len(line.trains) >= SPAWN_MAX_TRAINS:
            self._last_dispatch_blocked = True
            return False
        target_hw = live_dispatch.effective_headway_sec
        if self._spawn_elapsed_s < target_hw:
            return False
        if self._yard_occupied(line):
            self._last_dispatch_blocked = True
            return False

        next_run = max((t.run_number or 0) for t in line.trains) + 1 if line.trains else 0
        t = train.Train(chainage_front_m=SPAWN_CHAINAGE_M, direction=1, run_number=next_run, length_m=138.0)
        t.stop_index = SPAWN_STOP_INDEX
        t.apply_command(train.TrainCommand(direction=1, acceleration_level=2.0, e_brake=False))
        line.trains.append(t)
        self._spawn_elapsed_s = 0.0
        self._dispatch_count += 1
        self._last_dispatch_s = self._sim_time_s
        self._last_dispatch_blocked = False
        return True

    def dispatch_status(self, line: train.Line) -> dict:
        target_hw = live_dispatch.effective_headway_sec
        due_in = max(0.0, target_hw - self._spawn_elapsed_s)
        blocked = self._yard_occupied(line) or len(line.trains) >= SPAWN_MAX_TRAINS
        out = {
            "count": self._dispatch_count,
            "last_dispatch_sim_t": self._last_dispatch_s,
            "next_due_in_s": due_in,
            "blocked": blocked,
            "max_trains": SPAWN_MAX_TRAINS,
            "target_headway_sec": target_hw,
        }
        out.update(live_dispatch.status_payload())
        return out

    def step(self, dt: float = DT) -> None:
        self._sim_time_s += dt
        event_registry.tick(self.lines, dt, self._sim_time_s)
        for line in self.lines:
            self.zone.update(line.trains)
            self.ato.apply_commands(line.trains)
            for t in line.trains:
                t.step(dt, self.route_len_m)
                self.ato.tick_dwell(t, dt)
            live_dispatch.tick(self, line, dt)
            self.ato.cfg.dwell_sec = live_dispatch.effective_dwell_sec
            self._maybe_spawn(line, dt)


simulation = Simulation()

"""Injected incidents — timed effects on trains / wayside (see docs/PROJECT.md narrow API)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal

import commands as cmd_api
import train
from train import Train, TrainCommand

EventKind = Literal[
    "emergency_brake",
    "emergency_brake_release",
    "slow_speed",
    "door_fault",
    "signal_fail",
    "station_hold",
    "operator_note",
]

VALID_KINDS = frozenset(
    {
        "emergency_brake",
        "emergency_brake_release",
        "slow_speed",
        "door_fault",
        "signal_fail",
        "station_hold",
        "operator_note",
    }
)


@dataclass
class InjectedIncident:
    id: str
    kind: str
    duration_s: float
    remaining_s: float
    starts_in_s: float = 0.0
    target_train_id: str | None = None
    target_signal_id: str | None = None
    target_switch_id: str | None = None
    speed_limit_kph: float | None = None
    note: str = ""
    source: str = "manual"
    created_sim_t: float = 0.0
    active: bool = False
    _released_eb: bool = field(default=False, repr=False)


def _train_by_id(lines: list[train.Line], train_id: str) -> Train | None:
    if not train_id or not train_id.startswith("T"):
        return None
    try:
        run = int(train_id[1:])
    except ValueError:
        return None
    for line in lines:
        for tr in line.trains:
            if tr.run_number == run:
                return tr
    return None


class EventRegistry:
    def __init__(self) -> None:
        self._incidents: dict[str, InjectedIncident] = {}
        self._log: list[dict[str, Any]] = []
        self._max_log = 50

    def _log_event(self, *, severity: str, kind: str, message: str, source: str, sim_t: float) -> None:
        row = {
            "severity": severity,
            "kind": kind,
            "message": message,
            "source": source,
            "sim_t": sim_t,
        }
        self._log.insert(0, row)
        self._log = self._log[: self._max_log]

    def inject(
        self,
        *,
        lines: list[train.Line],
        kind: str,
        sim_time_s: float,
        duration_s: float = 30.0,
        starts_in_s: float = 0.0,
        target_train_id: str | None = None,
        target_signal_id: str | None = None,
        target_switch_id: str | None = None,
        speed_limit_kph: float | None = None,
        note: str = "",
        source: str = "manual",
        event_id: str | None = None,
    ) -> InjectedIncident:
        if kind not in VALID_KINDS:
            raise ValueError(f"unknown event kind: {kind!r}")
        if duration_s <= 0 and kind != "operator_note":
            raise ValueError("duration_s must be positive")
        if kind == "operator_note":
            duration_s = 0.0
            starts_in_s = 0.0

        eid = event_id or f"evt_{int(sim_time_s * 1000)}_{len(self._incidents)}"
        inc = InjectedIncident(
            id=eid,
            kind=kind,
            duration_s=float(duration_s),
            remaining_s=float(duration_s),
            starts_in_s=max(0.0, float(starts_in_s)),
            target_train_id=target_train_id,
            target_signal_id=target_signal_id,
            target_switch_id=target_switch_id,
            speed_limit_kph=speed_limit_kph,
            note=note.strip(),
            source=source,
            created_sim_t=sim_time_s,
            active=starts_in_s <= 0,
        )
        self._incidents[eid] = inc

        if inc.active:
            self._activate(inc, lines, sim_time_s=sim_time_s)
            if inc.kind == "operator_note":
                self._incidents.pop(eid, None)

        when = "now" if inc.active else f"in ~{inc.starts_in_s:.0f}s"
        self._log_event(
            severity="info",
            kind="INJT",
            source=source,
            sim_t=sim_time_s,
            message=f"scheduled {kind} {when}" + (f" → {target_train_id}" if target_train_id else "")
            + (f" ({note})" if note else ""),
        )
        return inc

    def cancel(self, event_id: str, *, lines: list[train.Line], sim_time_s: float) -> None:
        inc = self._incidents.pop(event_id, None)
        if inc is None:
            raise KeyError(event_id)
        if inc.active:
            self._clear_effects(inc, lines)
        self._deactivate(inc, sim_time_s=sim_time_s, reason="cancelled")

    def tick(self, lines: list[train.Line], dt: float, sim_time_s: float) -> None:
        expired: list[InjectedIncident] = []
        for inc in list(self._incidents.values()):
            if not inc.active:
                inc.starts_in_s = max(0.0, inc.starts_in_s - dt)
                if inc.starts_in_s <= 0:
                    inc.active = True
                    self._activate(inc, lines=lines, sim_time_s=sim_time_s)
                continue

            if inc.kind == "operator_note":
                continue

            inc.remaining_s = max(0.0, inc.remaining_s - dt)
            self._apply_active(inc, lines)
            if inc.remaining_s <= 0:
                expired.append(inc)

        for inc in expired:
            self._incidents.pop(inc.id, None)
            self._clear_effects(inc, lines)
            self._deactivate(inc, sim_time_s=sim_time_s, reason="expired")

    def _clear_effects(self, inc: InjectedIncident, lines: list[train.Line]) -> None:
        tr = _train_by_id(lines, inc.target_train_id) if inc.target_train_id else None
        if inc.kind == "emergency_brake" and tr is not None and not inc._released_eb:
            tr.apply_command(TrainCommand(tr.direction, 0.0, e_brake=False))
        if inc.kind == "signal_fail" and inc.target_signal_id:
            cmd_api.clear_signal_override(inc.target_signal_id)
        if tr is not None:
            for attr in ("_speed_cap_kph", "_door_interlock", "_station_hold"):
                if hasattr(tr, attr):
                    delattr(tr, attr)

    def _activate(self, inc: InjectedIncident, lines: list[train.Line] | None, sim_time_s: float) -> None:
        if lines is None:
            return
        if inc.kind == "signal_fail" and inc.target_signal_id:
            cmd_api.set_signal(inc.target_signal_id, "red")
        self._apply_active(inc, lines)
        self._log_event(
            severity="warn" if inc.kind in ("emergency_brake", "signal_fail") else "info",
            kind="INJT",
            source=inc.source,
            sim_t=sim_time_s,
            message=f"active {inc.kind}"
            + (f" → {inc.target_train_id}" if inc.target_train_id else "")
            + (f" ({inc.remaining_s:.0f}s left)" if inc.duration_s > 0 else ""),
        )

    def _deactivate(self, inc: InjectedIncident, *, sim_time_s: float, reason: str) -> None:
        self._log_event(
            severity="info",
            kind="INJT",
            source=inc.source,
            sim_t=sim_time_s,
            message=f"{inc.kind} {reason}",
        )

    def _apply_active(self, inc: InjectedIncident, lines: list[train.Line]) -> None:
        tr = _train_by_id(lines, inc.target_train_id) if inc.target_train_id else None

        if inc.kind == "emergency_brake" and tr is not None:
            tr.apply_command(TrainCommand(tr.direction, 0.0, e_brake=True))

        if inc.kind == "emergency_brake_release" and tr is not None:
            tr.apply_command(TrainCommand(tr.direction, 0.0, e_brake=False))
            inc._released_eb = True

        if inc.kind == "slow_speed" and tr is not None and inc.speed_limit_kph is not None:
            cap = float(inc.speed_limit_kph)
            if tr.speed > cap:
                tr.speed = cap
            setattr(tr, "_speed_cap_kph", cap)

        if inc.kind == "door_fault" and tr is not None:
            setattr(tr, "_door_interlock", True)
            tr.dwell_remaining_sec = max(tr.dwell_remaining_sec, 1.0)

        if inc.kind == "station_hold" and tr is not None:
            setattr(tr, "_station_hold", True)
            if tr.speed < 3.0:
                tr.dwell_remaining_sec = max(tr.dwell_remaining_sec, 1.0)

        if inc.kind == "signal_fail" and inc.target_signal_id:
            cmd_api.set_signal(inc.target_signal_id, "red")

    def active_payload(self) -> list[dict[str, Any]]:
        out = []
        for inc in self._incidents.values():
            out.append(
                {
                    "id": inc.id,
                    "kind": inc.kind,
                    "target_train_id": inc.target_train_id,
                    "target_signal_id": inc.target_signal_id,
                    "target_switch_id": inc.target_switch_id,
                    "duration_s": inc.duration_s,
                    "remaining_s": inc.remaining_s,
                    "starts_in_s": inc.starts_in_s,
                    "speed_limit_kph": inc.speed_limit_kph,
                    "note": inc.note,
                    "source": inc.source,
                    "active": inc.active,
                    "created_sim_t": inc.created_sim_t,
                }
            )
        return out

    def recent_log(self) -> list[dict[str, Any]]:
        return list(self._log)


registry = EventRegistry()

"""Manual switch/signal overrides from the dispatch UI (until operations DB exists)."""

from __future__ import annotations

from typing import Literal

import topology

SwitchState = Literal["normal", "reverse"]
SignalAspect = Literal["red", "yellow", "green"]

_switch_overrides: dict[str, SwitchState] = {}
_signal_overrides: dict[str, SignalAspect] = {}


def set_switch(switch_id: str, state: str) -> None:
    if state not in ("normal", "reverse"):
        raise ValueError(f"invalid switch state: {state!r}")
    _switch_overrides[switch_id] = state  # type: ignore[assignment]
    for sw in topology.YUS_TOPOLOGY["switches"]:
        if sw["id"] == switch_id:
            sw["state"] = state
            return
    raise KeyError(f"unknown switch_id: {switch_id!r}")


def set_signal(signal_id: str, aspect: str) -> None:
    if aspect not in ("red", "yellow", "green"):
        raise ValueError(f"invalid signal aspect: {aspect!r}")
    _signal_overrides[signal_id] = aspect  # type: ignore[assignment]
    for sig in topology.YUS_TOPOLOGY["signals"]:
        if sig["id"] == signal_id:
            sig["aspect"] = aspect
            return
    raise KeyError(f"unknown signal_id: {signal_id!r}")


def switch_state(switch_id: str, default: str) -> str:
    return _switch_overrides.get(switch_id, default)


def signal_aspect(signal_id: str, computed: str) -> str:
    return _signal_overrides.get(signal_id, computed)


def clear_signal_override(signal_id: str) -> None:
    _signal_overrides.pop(signal_id, None)

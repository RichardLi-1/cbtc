"""Manual switch/signal overrides from the dispatch UI (until operations DB exists)."""

from __future__ import annotations

from typing import Literal

import topology
import train as _train_mod

SwitchState = Literal["normal", "reverse"]
SignalAspect = Literal["red", "yellow", "green"]
DispatchAction = Literal["hold", "express", "skip", "release"]

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


def _find_train(train_id: str):
    """Resolve a 'T01'-style id to its Train instance, or None."""
    if not train_id or not train_id.startswith("T"):
        return None
    try:
        run = int(train_id[1:])
    except ValueError:
        return None
    for line in _train_mod.lines:
        for tr in line.trains:
            if tr.run_number == run:
                return tr
    return None


def set_train_dispatch(train_id: str, action: str, count: int = 1) -> None:
    """Service-regulation moves Transit Control issues to a single train.

    hold    — keep dwelling at the platform until released (close the gap behind)
    express — run non-stop past every station until released
    skip    — pass the next `count` stops, then resume normal stopping
    release — clear all overrides, back to normal ATO stopping
    """
    tr = _find_train(train_id)
    if tr is None:
        raise KeyError(f"unknown train_id: {train_id!r}")
    if action == "hold":
        tr._op_hold = True
        tr._op_express = False
        tr._op_skip_remaining = 0
    elif action == "express":
        tr._op_express = True
        tr._op_hold = False
        tr._op_skip_remaining = 0
    elif action == "skip":
        tr._op_skip_remaining = max(1, int(count))
        tr._op_express = False
        tr._op_hold = False
    elif action == "release":
        tr._op_hold = False
        tr._op_express = False
        tr._op_skip_remaining = 0
    else:
        raise ValueError(f"invalid dispatch action: {action!r}")

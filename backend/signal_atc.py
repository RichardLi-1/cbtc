"""Signal-aware ATP: derive fixed-signal aspects from block occupancy and find the
next red signal ahead of a given chainage so ATP can clamp authority to it."""

from __future__ import annotations

from typing import Iterable

import topology
from route_geom import ROUTE_LEN_M, ROUTE_SEGMENTS, chainage_to_edge, forward_distance, wrap_chainage

_EDGES = {e["id"]: e for e in topology.YUS_TOPOLOGY["edges"]}
_ROUTE = topology.YUS_TRAIN_ROUTE
_ROUTE_INDEX = {eid: i for i, eid in enumerate(_ROUTE)}
_ROUTE_LEN = len(_ROUTE)

# Edge-start chainages along the revenue ring.
_EDGE_START: dict[str, float] = {}
_acc = 0.0
for _eid, _len in ROUTE_SEGMENTS:
    _EDGE_START[_eid] = _acc
    _acc += _len

# Precompute (signal_id, chainage) sorted by chainage for fast "next ahead" lookup.
_SIG_CHAIN: list[tuple[str, float]] = []
for _sig in topology.YUS_TOPOLOGY["signals"]:
    _eid = _sig["edge_id"]
    if _eid not in _ROUTE_INDEX:
        continue
    _t = float(_sig.get("offset", 0.5))
    _edge_len = float(_EDGES[_eid]["length"])
    _ch = (_EDGE_START[_eid] + _t * _edge_len) % ROUTE_LEN_M
    _SIG_CHAIN.append((_sig["id"], _ch))
_SIG_CHAIN.sort(key=lambda kv: kv[1])


def occupied_blocks(trains: Iterable) -> set[str]:
    """Block ids currently containing a train nose."""
    out: set[str] = set()
    for t in trains:
        eid, _ = chainage_to_edge(t.chainage_front_m)
        edge = _EDGES.get(eid)
        if edge:
            out.add(edge["block_id"])
    return out


def compute_aspects(occupied: set[str]) -> dict[str, str]:
    """Per-signal aspect from block occupancy.

    Red if the block immediately ahead of the signal is occupied; yellow if the
    block after that is occupied; green otherwise. Signals protect what they
    face, not the block they sit in.
    """
    out: dict[str, str] = {}
    for sig in topology.YUS_TOPOLOGY["signals"]:
        eid = sig["edge_id"]
        idx = _ROUTE_INDEX.get(eid, -1)
        if idx < 0:
            out[sig["id"]] = "green"
            continue
        next_bid = _EDGES[_ROUTE[(idx + 1) % _ROUTE_LEN]]["block_id"]
        next2_bid = _EDGES[_ROUTE[(idx + 2) % _ROUTE_LEN]]["block_id"]
        if next_bid in occupied:
            out[sig["id"]] = "red"
        elif next2_bid in occupied:
            out[sig["id"]] = "yellow"
        else:
            out[sig["id"]] = "green"
    return out


def next_red_distance(train_front_m: float, aspects: dict[str, str]) -> float | None:
    """Forward distance (m) from train nose to the nearest red signal ahead, or None.

    A signal exactly at the nose (d <= 0.5 m) is treated as already passed — once
    a train has crossed a signal it should not be braked back by it.
    """
    if not _SIG_CHAIN:
        return None
    train_ch = wrap_chainage(train_front_m, ROUTE_LEN_M)
    best: float | None = None
    for sid, ch in _SIG_CHAIN:
        if aspects.get(sid) != "red":
            continue
        d = forward_distance(train_ch, ch, ROUTE_LEN_M)
        if d <= 0.5:
            continue
        if best is None or d < best:
            best = d
    return best

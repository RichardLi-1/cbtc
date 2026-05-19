"""Chainage helpers: absolute distance along the revenue loop (see docs/PROJECT.md)."""

from __future__ import annotations

import topology

_EDGES = {e["id"]: e for e in topology.YUS_TOPOLOGY["edges"]}
ROUTE_SEGMENTS: list[tuple[str, float]] = [
    (eid, float(_EDGES[eid]["length"])) for eid in topology.YUS_TRAIN_ROUTE
]
ROUTE_LEN_M: float = sum(length for _, length in ROUTE_SEGMENTS)


def wrap_chainage(s: float, route_len: float = ROUTE_LEN_M) -> float:
    """Map an arbitrary chainage to [0, route_len)."""
    r = s % route_len
    return float(r + route_len if r < -1e-12 else r)


def forward_distance(chainage_from: float, chainage_to: float, route_len: float = ROUTE_LEN_M) -> float:
    """Distance travelling forward along the ring from chainage_from to chainage_to."""
    a = wrap_chainage(chainage_from, route_len)
    b = wrap_chainage(chainage_to, route_len)
    d = b - a
    if d < 0:
        d += route_len
    return float(d)


def ahead_of_berth_m(train_front_m: float, berth_m: float, route_len: float = ROUTE_LEN_M) -> float:
    """Metres the train nose is past the berth along the forward direction (0 until passed)."""
    return forward_distance(berth_m, train_front_m, route_len)


def chainage_to_edge(chainage: float, route_len: float = ROUTE_LEN_M) -> tuple[str, float]:
    """Map wrapped chainage (m) to topology edge id and parametric offset along that edge in [0,1]."""
    dist = wrap_chainage(chainage, route_len)
    acc = 0.0
    for eid, length in ROUTE_SEGMENTS:
        if length <= 0:
            continue
        if acc + length >= dist:
            return eid, min(1.0, (dist - acc) / length)
        acc += length
    return ROUTE_SEGMENTS[0][0], 0.0

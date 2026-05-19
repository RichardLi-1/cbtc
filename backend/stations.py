"""Station berths along the revenue loop (chainage from GTFS-derived topology)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import topology
from route_geom import ROUTE_LEN_M

_DATA = Path(__file__).resolve().parent / "data" / "yus_topology.json"
_EDGES = {e["id"]: e for e in topology.YUS_TOPOLOGY["edges"]}


@dataclass(frozen=True)
class StationBerth:
    chainage_m: float
    name: str
    stop_index: int
    leg: str  # "ob" | "ib"


def _edge_len(eid: str) -> float:
    return float(_EDGES[eid]["length"])


def build_yus_berths() -> list[StationBerth]:
    """Berths in travel order: outbound stops 0..n-1, then inbound n-1..0."""
    raw = json.loads(_DATA.read_text(encoding="utf-8"))
    stop_names = [s["name"] for s in raw["line"]["stops"]]
    n = len(stop_names)
    berths: list[StationBerth] = []
    acc = 0.0

    for eid in topology.YUS_TRAIN_ROUTE:
        if eid.startswith("ob_"):
            parts = eid.split("_")
            i = int(parts[1])
            berths.append(StationBerth(acc, stop_names[i], i, "ob"))
        elif eid.startswith("ib_"):
            parts = eid.split("_")
            j = int(parts[1])
            berths.append(StationBerth(acc, stop_names[j], j, "ib"))
        acc += _edge_len(eid)

    return berths


YUS_BERTHS: list[StationBerth] = build_yus_berths()

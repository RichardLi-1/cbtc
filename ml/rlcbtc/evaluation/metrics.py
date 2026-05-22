from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, int(round((len(ordered) - 1) * p)))
    return float(ordered[idx])


def compute_metrics(rows: list[dict]) -> dict:
    delays = [float(r.get("delay_sec", 0.0)) for r in rows if isinstance(r, dict)]
    headways = [float(r.get("headway_std_sec", 0.0)) for r in rows if isinstance(r, dict)]
    delay_mean = sum(delays) / len(delays) if delays else 0.0
    headway_mean = sum(headways) / len(headways) if headways else 0.0
    return {
        "count": len(rows),
        "delay_mean_sec": delay_mean,
        "avg_delay_sec": delay_mean,
        "delay_p95_sec": _percentile(delays, 0.95),
        "p95_delay_sec": _percentile(delays, 0.95),
        "headway_std_mean_sec": headway_mean,
        "headway_std_sec": headway_mean,
    }


def episode_metric_series(rows: list[dict], field: str) -> list[float]:
    """Per-episode step mean for `field`, ordered by episode index."""
    by_ep: dict[int, list[float]] = defaultdict(list)
    for row in rows:
        if not isinstance(row, dict):
            continue
        by_ep[int(row["episode"])].append(float(row.get(field, 0.0)))
    return [sum(vals) / len(vals) for ep in sorted(by_ep) for vals in [by_ep[ep]]]


def load_trace_rows(trace_path: Path) -> list[dict]:
    rows: list[dict] = []
    for line in trace_path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def load_evaluation(run_dir: Path, filename: str = "evaluation.json") -> dict:
    path = Path(run_dir) / filename
    if not path.exists():
        raise FileNotFoundError(f"missing evaluation summary: {path}")
    return json.loads(path.read_text(encoding="utf-8"))

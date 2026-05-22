from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING

from rlcbtc.evaluation.metrics import compute_metrics, load_trace_rows
from rlcbtc.evaluation.rollout import run_rollout

if TYPE_CHECKING:
    from rlcbtc.evaluation.rollout import DispatchPolicy


def build_scenario_ids(n: int) -> list[str]:
    return [f"scenario_{i:04d}" for i in range(n)]


def run_seed_sweep(
    policy: DispatchPolicy,
    *,
    run_dir: Path,
    seeds: list[int],
    episodes_per_seed: int = 5,
    env_kwargs: dict | None = None,
) -> dict:
    """Evaluate one policy across multiple base seeds; aggregate delay/headway."""
    env_kwargs = env_kwargs or {}
    all_rows: list[dict] = []
    for base_seed in seeds:
        trace_dir = run_dir / "sweeps" / f"seed_{base_seed}"
        summary_path = run_rollout(
            policy,
            run_dir=trace_dir,
            episodes=episodes_per_seed,
            seed=base_seed,
            env_kwargs=env_kwargs,
            trace_subdir="traces",
            summary_name="evaluation.json",
        )
        trace_path = trace_dir / "traces" / "steps.jsonl"
        if trace_path.exists():
            all_rows.extend(load_trace_rows(trace_path))
        else:
            _ = summary_path

    aggregate = compute_metrics(all_rows)
    aggregate["seeds"] = seeds
    aggregate["episodes_per_seed"] = episodes_per_seed
    out = run_dir / "sweep_summary.json"
    out.write_text(json.dumps(aggregate, indent=2), encoding="utf-8")
    return aggregate

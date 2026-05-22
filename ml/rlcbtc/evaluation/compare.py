from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from rlcbtc.evaluation.metrics import (
    episode_metric_series,
    load_evaluation,
    load_trace_rows,
)
from rlcbtc.evaluation.significance import bootstrap_ci

TRACE_CANDIDATES = ("eval_traces/steps.jsonl", "traces/steps.jsonl")


def _load_config(run_dir: Path) -> dict:
    path = run_dir / "config.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _find_trace(run_dir: Path) -> Path | None:
    for rel in TRACE_CANDIDATES:
        candidate = run_dir / rel
        if candidate.exists():
            return candidate
    return None


def _env_signature(cfg: dict) -> dict:
    env_cfg = cfg.get("env", {})
    safety = cfg.get("safety", {})
    return {
        "horizon_steps": int(env_cfg.get("episode_horizon_steps", 600)),
        "dt_seconds": float(env_cfg.get("dt_seconds", 1)),
        "shield_enabled": bool(safety.get("shield_enabled", True)),
    }


def _pct_change(baseline: float, candidate: float) -> float | None:
    if baseline <= 0:
        return None
    return 100.0 * (baseline - candidate) / baseline


def _metric_block(eval_summary: dict) -> dict:
    return {
        "delay_mean_sec": float(eval_summary.get("delay_mean_sec", eval_summary.get("avg_delay_sec", 0.0))),
        "delay_p95_sec": float(eval_summary.get("delay_p95_sec", eval_summary.get("p95_delay_sec", 0.0))),
        "headway_std_mean_sec": float(
            eval_summary.get("headway_std_mean_sec", eval_summary.get("headway_std_sec", 0.0))
        ),
        "unsafe_action_rate": float(eval_summary.get("unsafe_action_rate", 0.0)),
        "episodes": int(eval_summary.get("episodes", 0)),
    }


def compare_runs(rl_run: Path, baseline_run: Path, *, out_path: Path | None = None) -> dict:
    rl_run = Path(rl_run)
    baseline_run = Path(baseline_run)

    rl_eval = load_evaluation(rl_run)
    baseline_eval = load_evaluation(baseline_run)
    rl_metrics = _metric_block(rl_eval)
    baseline_metrics = _metric_block(baseline_eval)

    rl_cfg = _load_config(rl_run)
    baseline_cfg = _load_config(baseline_run)
    warnings: list[str] = []
    rl_seed = int(rl_cfg.get("seed", rl_eval.get("seed", -1)))
    baseline_seed = int(baseline_cfg.get("seed", baseline_eval.get("seed", -1)))
    if rl_seed >= 0 and baseline_seed >= 0 and rl_seed != baseline_seed:
        warnings.append(f"seed mismatch: rl={rl_seed} baseline={baseline_seed}")
    rl_env = _env_signature(rl_cfg)
    baseline_env = _env_signature(baseline_cfg)
    if rl_cfg and baseline_cfg and rl_env != baseline_env:
        warnings.append(f"env mismatch: rl={rl_env} baseline={baseline_env}")

    episode_stats: dict | None = None
    rl_trace = _find_trace(rl_run)
    baseline_trace = _find_trace(baseline_run)
    if rl_trace and baseline_trace:
        rl_delays = episode_metric_series(load_trace_rows(rl_trace), "delay_sec")
        baseline_delays = episode_metric_series(load_trace_rows(baseline_trace), "delay_sec")
        rl_headways = episode_metric_series(load_trace_rows(rl_trace), "headway_std_sec")
        baseline_headways = episode_metric_series(load_trace_rows(baseline_trace), "headway_std_sec")
        n = min(len(rl_delays), len(baseline_delays))
        if n:
            delay_deltas = [baseline_delays[i] - rl_delays[i] for i in range(n)]
            headway_deltas = [baseline_headways[i] - rl_headways[i] for i in range(min(len(rl_headways), len(baseline_headways), n))]
            episode_stats = {
                "episodes_compared": n,
                "delay_delta_mean_sec": sum(delay_deltas) / n,
                "delay_delta_ci_sec": bootstrap_ci(delay_deltas),
                "headway_std_delta_mean_sec": sum(headway_deltas) / len(headway_deltas) if headway_deltas else 0.0,
                "headway_std_delta_ci_sec": bootstrap_ci(headway_deltas) if headway_deltas else (0.0, 0.0),
            }

    summary = {
        "rl_run": str(rl_run),
        "baseline_run": str(baseline_run),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "seed": rl_seed if rl_seed == baseline_seed else {"rl": rl_seed, "baseline": baseline_seed},
        "env": rl_env if rl_env == baseline_env else {"rl": rl_env, "baseline": baseline_env},
        "warnings": warnings,
        "rl": rl_metrics,
        "baseline": baseline_metrics,
        "delay_reduction_pct": _pct_change(baseline_metrics["delay_mean_sec"], rl_metrics["delay_mean_sec"]),
        "headway_std_reduction_pct": _pct_change(
            baseline_metrics["headway_std_mean_sec"], rl_metrics["headway_std_mean_sec"]
        ),
        "unsafe_action_rate_delta": rl_metrics["unsafe_action_rate"] - baseline_metrics["unsafe_action_rate"],
        "episode_stats": episode_stats,
    }

    out = out_path or (rl_run / "comparison.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary

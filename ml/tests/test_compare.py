import json
from pathlib import Path

from rlcbtc.evaluation.compare import compare_runs


def _write_eval(run_dir: Path, *, delay_mean: float, headway_std: float, seed: int = 42) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    (run_dir / "config.json").write_text(
        json.dumps(
            {
                "seed": seed,
                "eval_episodes": 2,
                "env": {"episode_horizon_steps": 10, "dt_seconds": 1},
                "safety": {"shield_enabled": True},
            }
        ),
        encoding="utf-8",
    )
    (run_dir / "evaluation.json").write_text(
        json.dumps(
            {
                "episodes": 2,
                "delay_mean_sec": delay_mean,
                "delay_p95_sec": delay_mean,
                "headway_std_mean_sec": headway_std,
                "unsafe_action_rate": 0.01,
                "seed": seed,
            }
        ),
        encoding="utf-8",
    )
    trace_dir = run_dir / "traces"
    trace_dir.mkdir(parents=True, exist_ok=True)
    rows = [
        {"episode": 0, "delay_sec": delay_mean, "headway_std_sec": headway_std},
        {"episode": 1, "delay_sec": delay_mean + 1.0, "headway_std_sec": headway_std + 0.5},
    ]
    with (trace_dir / "steps.jsonl").open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")


def test_compare_runs_computes_real_percentages(tmp_path: Path):
    baseline = tmp_path / "baseline"
    rl = tmp_path / "rl"
    _write_eval(baseline, delay_mean=100.0, headway_std=20.0)
    _write_eval(rl, delay_mean=80.0, headway_std=15.0)

    summary = compare_runs(rl, baseline)

    assert summary["delay_reduction_pct"] == 20.0
    assert summary["headway_std_reduction_pct"] == 25.0
    assert (rl / "comparison.json").exists()
    assert summary["warnings"] == []

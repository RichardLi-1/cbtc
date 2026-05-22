from __future__ import annotations

import json
from pathlib import Path

from rlcbtc.evaluation.metrics import load_evaluation


def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "n/a (baseline mean is zero)"
    return f"{value:+.1f}%"


def _fmt_sec(value: float) -> str:
    return f"{value:.2f}s"


def generate_report(run_dir: Path, *, baseline_run: Path | None = None) -> Path:
    run_dir = Path(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)

    eval_summary = load_evaluation(run_dir)
    comparison_path = run_dir / "comparison.json"
    if baseline_run is not None and not comparison_path.exists():
        from rlcbtc.evaluation.compare import compare_runs

        compare_runs(run_dir, baseline_run)

    lines = ["# Experiment Report", ""]
    lines.append("## This run")
    lines.append(f"- Episodes: {int(eval_summary.get('episodes', 0))}")
    lines.append(f"- Mean delay: {_fmt_sec(float(eval_summary.get('delay_mean_sec', 0.0)))}")
    lines.append(f"- P95 delay: {_fmt_sec(float(eval_summary.get('delay_p95_sec', 0.0)))}")
    lines.append(
        f"- Mean headway std: {_fmt_sec(float(eval_summary.get('headway_std_mean_sec', eval_summary.get('headway_std_sec', 0.0))))}"
    )
    lines.append(f"- Unsafe action rate: {float(eval_summary.get('unsafe_action_rate', 0.0)):.4f}")
    if "seed" in eval_summary:
        lines.append(f"- Eval seed: {eval_summary['seed']}")

    if comparison_path.exists():
        comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
        lines.extend(["", "## RL vs baseline"])
        lines.append(f"- Baseline run: `{comparison.get('baseline_run', '')}`")
        delay_pct = comparison.get("delay_reduction_pct")
        headway_pct = comparison.get("headway_std_reduction_pct")
        lines.append(f"- Delay reduction: {_fmt_pct(delay_pct)}")
        lines.append(f"- Headway std reduction: {_fmt_pct(headway_pct)}")
        rl = comparison.get("rl", {})
        baseline = comparison.get("baseline", {})
        lines.append(
            f"- RL mean delay {_fmt_sec(float(rl.get('delay_mean_sec', 0.0)))} "
            f"vs baseline {_fmt_sec(float(baseline.get('delay_mean_sec', 0.0)))}"
        )
        episode_stats = comparison.get("episode_stats")
        if episode_stats:
            ci = episode_stats.get("delay_delta_ci_sec", [0.0, 0.0])
            lines.append(
                f"- Paired delay delta (baseline − RL): "
                f"{float(episode_stats.get('delay_delta_mean_sec', 0.0)):.2f}s "
                f"CI [{float(ci[0]):.2f}, {float(ci[1]):.2f}]"
            )
        warnings = comparison.get("warnings") or []
        if warnings:
            lines.append("")
            lines.append("### Warnings")
            for warning in warnings:
                lines.append(f"- {warning}")

    out = run_dir / "report.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out

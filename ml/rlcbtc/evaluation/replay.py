"""Step traces and episode summaries for offline policy evaluation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from rlcbtc.evaluation.metrics import compute_metrics


class ReplayLogger:
    def __init__(self, trace_dir: Path) -> None:
        self.trace_dir = trace_dir
        self.trace_dir.mkdir(parents=True, exist_ok=True)
        self._rows: list[dict[str, Any]] = []

    def log_step(self, episode: int, step: int, obs, action, reward: float, info: dict) -> None:
        metrics = info.get("metrics", {})
        self._rows.append(
            {
                "episode": episode,
                "step": step,
                "reward": float(reward),
                "delay_sec": float(metrics.get("mean_delay_sec", 0.0)),
                "headway_std_sec": float(metrics.get("headway_std_sec", 0.0)),
                "violations": int(metrics.get("violations", 0)),
                "shield_intervened": bool(info.get("shield", {}).get("intervened")),
            }
        )

    def flush_summary(
        self,
        out_path: Path,
        *,
        seed: int | None = None,
        shield_enabled: bool | None = None,
    ) -> None:
        trace_path = self.trace_dir / "steps.jsonl"
        with trace_path.open("w", encoding="utf-8") as f:
            for row in self._rows:
                f.write(json.dumps(row) + "\n")
        summary = compute_metrics(self._rows)
        summary["episodes"] = len({r["episode"] for r in self._rows})
        summary["unsafe_action_rate"] = sum(1 for r in self._rows if r.get("shield_intervened")) / max(
            len(self._rows), 1
        )
        if seed is not None:
            summary["seed"] = seed
        if shield_enabled is not None:
            summary["shield_enabled"] = shield_enabled
        out_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

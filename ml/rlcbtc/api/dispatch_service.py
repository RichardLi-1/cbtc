"""Rule-based vs PPO dispatch comparison for the training API."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from rlcbtc.evaluation.rollout import run_rollout
from rlcbtc.policies.factory import build_policy, load_ppo_policy
from rlcbtc.utils.config import load_yaml

_ML_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_POLICY = _ML_ROOT / "models" / "deployed" / "ppo_baseline" / "policy.zip"
_SMOKE_CONFIG = _ML_ROOT / "configs" / "experiments" / "rule_based_smoke.yaml"

_last_comparison: dict[str, Any] | None = None


def deployed_policy_path() -> Path:
    raw = os.environ.get("RLCBTC_POLICY_PATH", "")
    path = Path(raw) if raw else _DEFAULT_POLICY
    return path.resolve()


def policy_info() -> dict[str, Any]:
    path = deployed_policy_path()
    return {
        "path": str(path),
        "exists": path.is_file(),
        "size_bytes": path.stat().st_size if path.is_file() else 0,
    }


def _env_kwargs_from_config(cfg: dict) -> dict[str, Any]:
    env = cfg.get("env", {})
    safety = cfg.get("safety", {})
    return {
        "horizon_steps": int(env.get("episode_horizon_steps", 120)),
        "dt_seconds": float(env.get("dt_seconds", 1.0)),
        "shield_enabled": bool(safety.get("shield_enabled", True)),
    }


def _read_summary(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _metric_view(summary: dict[str, Any]) -> dict[str, float | int]:
    return {
        "delay_mean_sec": float(summary.get("delay_mean_sec", summary.get("avg_delay_sec", 0.0))),
        "delay_p95_sec": float(summary.get("delay_p95_sec", summary.get("p95_delay_sec", 0.0))),
        "headway_std_mean_sec": float(
            summary.get("headway_std_mean_sec", summary.get("headway_std_sec", 0.0))
        ),
        "unsafe_action_rate": float(summary.get("unsafe_action_rate", 0.0)),
        "episodes": int(summary.get("episodes", 0)),
    }


def _delta(rule: dict[str, float | int], ppo: dict[str, float | int]) -> dict[str, float | None]:
    out: dict[str, float | None] = {}
    for key in ("delay_mean_sec", "delay_p95_sec", "headway_std_mean_sec", "unsafe_action_rate"):
        base = float(rule.get(key, 0.0))
        cand = float(ppo.get(key, 0.0))
        out[f"{key}_pct_vs_rule"] = (100.0 * (base - cand) / base) if base > 0 else None
    return out


def compare_dispatch(*, episodes: int | None = None, seed: int | None = None) -> dict[str, Any]:
    global _last_comparison

    cfg = load_yaml(_SMOKE_CONFIG)
    env_kwargs = _env_kwargs_from_config(cfg)
    ep = int(episodes if episodes is not None else cfg.get("eval_episodes", 5))
    run_seed = int(seed if seed is not None else cfg.get("seed", 42))

    policy_path = deployed_policy_path()
    if not policy_path.is_file():
        raise FileNotFoundError(f"deployed PPO policy missing: {policy_path}")

    ppo_policy = load_ppo_policy(policy_path)
    rule_policy = build_policy("rule_based")

    with tempfile.TemporaryDirectory(prefix="dispatch-compare-") as tmp:
        base = Path(tmp)
        rule_dir = base / "rule_based"
        ppo_dir = base / "ppo"
        rule_dir.mkdir()
        ppo_dir.mkdir()

        rule_summary_path = run_rollout(
            rule_policy,
            run_dir=rule_dir,
            episodes=ep,
            seed=run_seed,
            env_kwargs=env_kwargs,
        )
        ppo_summary_path = run_rollout(
            ppo_policy,
            run_dir=ppo_dir,
            episodes=ep,
            seed=run_seed,
            env_kwargs=env_kwargs,
        )

        rule_metrics = _metric_view(_read_summary(rule_summary_path))
        ppo_metrics = _metric_view(_read_summary(ppo_summary_path))

    result = {
        "seed": run_seed,
        "episodes": ep,
        "env": env_kwargs,
        "policy_path": str(policy_path),
        "rule_based": rule_metrics,
        "ppo": ppo_metrics,
        "delta_pct": _delta(rule_metrics, ppo_metrics),
    }
    _last_comparison = result
    return result


def latest_comparison() -> dict[str, Any] | None:
    return _last_comparison

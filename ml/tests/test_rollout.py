import json
from pathlib import Path

from rlcbtc.evaluation.rollout import run_rollout
from rlcbtc.policies.factory import build_policy


def test_run_rollout_writes_traces_and_summary(tmp_path: Path):
    policy = build_policy("rule_based")
    summary = run_rollout(
        policy,
        run_dir=tmp_path,
        episodes=2,
        seed=0,
        env_kwargs={"horizon_steps": 10, "dt_seconds": 1.0, "shield_enabled": True},
    )
    assert summary.exists()
    traces = tmp_path / "traces" / "steps.jsonl"
    assert traces.exists()
    rows = [json.loads(line) for line in traces.read_text().splitlines() if line.strip()]
    assert len(rows) == 20
    payload = json.loads(summary.read_text())
    assert "delay_mean_sec" in payload
    assert payload["episodes"] == 2

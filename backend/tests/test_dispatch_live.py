"""Live dispatch snapshot + policy fields on /state."""

import train
from dispatch_live import LiveDispatchBridge, live_dispatch
from main import get_dispatch_policy, get_state, post_dispatch_policy
from sim import simulation


def test_build_snapshot_from_sim():
    line = train.lines[0]
    snap = LiveDispatchBridge.build_snapshot(simulation, line)
    assert "trains" in snap
    assert snap["route_len_m"] > 0


def test_dispatch_policy_handlers():
    body = get_dispatch_policy()
    assert body["policy_mode"] in ("rule", "ppo")

    out = post_dispatch_policy(type("B", (), {"mode": "rule"})())
    assert out["ok"] is True
    assert out["policy_mode"] == "rule"


def test_state_includes_live_dispatch_fields():
    payload = get_state()
    dispatch = payload["ops"]["dispatch"]
    assert dispatch["policy_mode"] in ("rule", "ppo")
    assert "effective_headway_sec" in dispatch
    assert live_dispatch.effective_headway_sec >= 60.0

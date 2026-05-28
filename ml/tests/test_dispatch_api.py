from pathlib import Path

from rlcbtc.api.dispatch_service import compare_dispatch, policy_info


def test_policy_info_finds_bundled_model():
    info = policy_info()
    assert info["exists"] is True
    assert Path(info["path"]).is_file()


def test_compare_dispatch_smoke():
    result = compare_dispatch(episodes=2, seed=42)
    assert result["episodes"] == 2
    assert "rule_based" in result and "ppo" in result
    assert result["rule_based"]["delay_mean_sec"] >= 0

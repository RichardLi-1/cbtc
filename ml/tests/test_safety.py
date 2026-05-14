from rlcbtc.safety.shield import ActionShield


def test_shield_api():
    action, meta = ActionShield().apply([0, 0], {})
    assert action is not None
    assert 'intervened' in meta

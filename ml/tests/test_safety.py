from rlcbtc.safety.constraints import Constraints
from rlcbtc.safety.shield import ActionShield
from rlcbtc.safety.validator import ActionValidator


def test_shield_api():
    action, meta = ActionShield().apply([0, 0], {})
    assert action is not None
    assert 'intervened' in meta


def test_validator_speed_cap():
    v = ActionValidator(Constraints(max_speed_mps=20.0))
    assert v.is_safe([0], {'speed_mps': 19.0})
    assert not v.is_safe([0], {'speed_mps': 25.0})

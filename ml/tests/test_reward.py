from rlcbtc.envs.reward import HEADWAY_VAR_WEIGHT, SHIELD_INTERVENTION_PENALTY, compute_reward


def test_reward_sign():
    assert compute_reward(10, 2, 0) < 0


def test_headway_weight_applied():
    base = compute_reward(0.0, 4.0, 0)
    assert base == -HEADWAY_VAR_WEIGHT * 4.0


def test_shield_intervention_penalty():
    base = compute_reward(0.0, 0.0, 0)
    penalized = compute_reward(0.0, 0.0, 0, shield_intervened=True)
    assert penalized == base - SHIELD_INTERVENTION_PENALTY

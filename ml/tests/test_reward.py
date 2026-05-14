from rlcbtc.envs.reward import compute_reward


def test_reward_sign():
    assert compute_reward(10, 2, 0) < 0

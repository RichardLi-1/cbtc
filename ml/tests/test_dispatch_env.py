from rlcbtc.envs.dispatch_env import DispatchEnv
from rlcbtc.policies.rule_based import RuleBasedDispatchPolicy


def test_env_step_shape():
    env = DispatchEnv(horizon_steps=5)
    obs, _ = env.reset()
    assert obs.shape == (16,)
    obs, reward, term, trunc, info = env.step([0.0, 0.0])
    assert obs.shape == (16,)
    assert "metrics" in info


def test_rule_based_runs_episode():
    env = DispatchEnv(horizon_steps=10)
    policy = RuleBasedDispatchPolicy()
    obs, _ = env.reset()
    for _ in range(10):
        obs, _, term, _, _ = env.step(policy.act(obs))
        if term:
            break

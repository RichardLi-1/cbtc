from rlcbtc.policies.rule_based import RuleBasedDispatchPolicy


def build_policy(name: str):
    if name == 'rule_based':
        return RuleBasedDispatchPolicy()
    raise ValueError(f'Unknown policy: {name}')

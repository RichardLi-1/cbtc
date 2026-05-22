HEADWAY_VAR_WEIGHT = 0.25
# Penalize proposed actions the shield overrode so PPO does not get credit for safe fallbacks.
SHIELD_INTERVENTION_PENALTY = 1.0


def compute_reward(
    delay_sec: float,
    headway_var: float,
    violations: int,
    *,
    shield_intervened: bool = False,
) -> float:
    reward = -delay_sec - HEADWAY_VAR_WEIGHT * headway_var - 10.0 * violations
    if shield_intervened:
        reward -= SHIELD_INTERVENTION_PENALTY
    return reward

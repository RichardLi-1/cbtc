HEADWAY_VAR_WEIGHT = 0.25


def compute_reward(delay_sec: float, headway_var: float, violations: int) -> float:
    return -delay_sec - HEADWAY_VAR_WEIGHT * headway_var - 10.0 * violations

def compute_reward(delay_sec: float, headway_var: float, violations: int) -> float:
    return -delay_sec - 0.2 * headway_var - 10.0 * violations

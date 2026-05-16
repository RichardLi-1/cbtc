from rlcbtc.safety.constraints import Constraints


class ActionValidator:
    def __init__(self, constraints: Constraints):
        self.constraints = constraints

    def is_safe(self, action, state) -> bool:
        speed = float(state.get('speed_mps', 0.0))
        return speed <= self.constraints.max_speed_mps

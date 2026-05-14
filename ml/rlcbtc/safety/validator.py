from rlcbtc.safety.constraints import Constraints


class ActionValidator:
    def __init__(self, constraints: Constraints):
        self.constraints = constraints

    def is_safe(self, action, state) -> bool:
        return True

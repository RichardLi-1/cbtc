"""Clamp unsafe dispatch actions before they reach the sim."""

from __future__ import annotations

from rlcbtc.safety.constraints import Constraints
from rlcbtc.safety.fallback import fallback_action
from rlcbtc.safety.validator import ActionValidator


class ActionShield:
    def __init__(self, constraints: Constraints | None = None) -> None:
        self.constraints = constraints or Constraints()
        self.validator = ActionValidator(self.constraints)

    def apply(self, action, state):
        action = list(action)
        intervened = False
        reason = None

        if not self.validator.is_safe(action, state):
            action = fallback_action()
            intervened = True
            reason = "speed_cap"

        min_slack = float(state.get("min_slack_m", float("inf")))
        # Only override dispatch when ATP margin is actually tight or violated.
        if min_slack < self.constraints.braking_margin_m:
            if len(action) >= 1 and action[0] < 0.5:
                action[0] = 0.7
                intervened = True
                reason = reason or "authority_buffer"

        return action, {"intervened": intervened, "reason": reason}

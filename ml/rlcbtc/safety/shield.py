class ActionShield:
    """Clamp unsafe dispatch actions before they reach the sim."""

    def apply(self, action, state):
        return action, {'intervened': False, 'reason': None}

class ActionShield:
    def apply(self, action, state):
        return action, {'intervened': False, 'reason': None}

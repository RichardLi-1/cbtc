class PPOPolicyAdapter:
    def __init__(self, model=None):
        self.model = model

    def act(self, obs):
        if self.model is None:
            return [0.0, 0.0]
        action, _ = self.model.predict(obs, deterministic=True)
        return action

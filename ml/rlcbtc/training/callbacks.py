class MetricsCallback:
    def __init__(self):
        self.steps = 0

    def on_step(self):
        self.steps += 1
        return True

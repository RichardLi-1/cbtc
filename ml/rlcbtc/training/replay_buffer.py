class ReplayStore:
    def __init__(self, capacity: int = 100_000):
        self.capacity = capacity
        self.items = []

    def push(self, transition) -> None:
        self.items.append(transition)
        if len(self.items) > self.capacity:
            self.items.pop(0)

    def __len__(self) -> int:
        return len(self.items)

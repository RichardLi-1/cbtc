class Tracker:
    def __init__(self):
        self._history: dict[str, list] = {}

    def log(self, key: str, value):
        self._history.setdefault(key, []).append(value)

    def last(self, key: str):
        series = self._history.get(key, [])
        return series[-1] if series else None

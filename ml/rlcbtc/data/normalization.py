def normalize_observation(obs):
    return obs


def min_max_scale(values, low: float, high: float):
    span = high - low
    if span <= 0:
        return [0.0 for _ in values]
    return [(v - low) / span for v in values]

def bootstrap_ci(values):
    if not values:
        return (0.0, 0.0)
    return (min(values), max(values))

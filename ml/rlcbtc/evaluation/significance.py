def bootstrap_ci(values, alpha: float = 0.05):
    if not values:
        return (0.0, 0.0)
    ordered = sorted(values)
    lo_idx = max(0, int(len(ordered) * (alpha / 2)) - 1)
    hi_idx = min(len(ordered) - 1, int(len(ordered) * (1 - alpha / 2)))
    return (float(ordered[lo_idx]), float(ordered[hi_idx]))

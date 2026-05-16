def _percentile(values, p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, int(round((len(ordered) - 1) * p)))
    return float(ordered[idx])


def compute_metrics(rows):
    delays = [float(r.get('delay_sec', 0.0)) for r in rows if isinstance(r, dict)]
    return {
        'count': len(rows),
        'delay_mean_sec': sum(delays) / len(delays) if delays else 0.0,
        'delay_p95_sec': _percentile(delays, 0.95),
    }

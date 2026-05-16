from rlcbtc.evaluation.metrics import compute_metrics


def test_metrics_count():
    m = compute_metrics([1, 2, 3])
    assert m['count'] == 3


def test_metrics_delay_stats():
    rows = [
        {'delay_sec': 10.0},
        {'delay_sec': 20.0},
        {'delay_sec': 30.0},
    ]
    m = compute_metrics(rows)
    assert m['delay_mean_sec'] == 20.0
    assert m['delay_p95_sec'] == 30.0

from rlcbtc.evaluation.metrics import compute_metrics


def test_metrics_count():
    m = compute_metrics([1, 2, 3])
    assert m['count'] == 3

from rlcbtc.evaluation.significance import bootstrap_ci


def test_bootstrap_ci_empty():
    assert bootstrap_ci([]) == (0.0, 0.0)


def test_bootstrap_ci_ordered_bounds():
    lo, hi = bootstrap_ci([1.0, 2.0, 3.0, 4.0, 5.0])
    assert lo <= hi

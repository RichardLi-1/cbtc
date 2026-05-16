from rlcbtc.data.normalization import min_max_scale


def test_min_max_scale_bounds():
    out = min_max_scale([0.0, 5.0, 10.0], 0.0, 10.0)
    assert out == [0.0, 0.5, 1.0]


def test_min_max_scale_degenerate_span():
    assert min_max_scale([3.0, 4.0], 1.0, 1.0) == [0.0, 0.0]

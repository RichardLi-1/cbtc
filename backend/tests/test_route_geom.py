"""Chainage / edge mapping smoke tests."""

from route_geom import ROUTE_LEN_M, chainage_to_edge, forward_distance, wrap_chainage


def test_wrap_chainage():
    assert wrap_chainage(0) == 0.0
    assert abs(wrap_chainage(ROUTE_LEN_M) - 0.0) < 1e-6
    assert abs(wrap_chainage(-10) - (ROUTE_LEN_M - 10)) < 1e-6


def test_forward_distance_wraps():
    d = forward_distance(ROUTE_LEN_M - 100, 50)
    assert d == 150.0


def test_chainage_to_edge_in_range():
    eid, off = chainage_to_edge(0.0)
    assert eid
    assert 0.0 <= off <= 1.0


def test_berth_approach_before_and_after():
    from route_geom import berth_approach

    dist, ahead = berth_approach(-5.0, 0.0, ROUTE_LEN_M)
    assert ahead == 0.0
    assert dist < 10.0

    _, ahead2 = berth_approach(58.0, 0.0, ROUTE_LEN_M)
    assert ahead2 > 20.0


def test_chainage_boundary_uses_next_edge():
    from stations import YUS_BERTHS

    berth = YUS_BERTHS[1]  # Highway 407 — start of ob_1_2
    eid, off = chainage_to_edge(berth.chainage_m)
    assert eid == "ob_1_2"
    assert off < 0.01

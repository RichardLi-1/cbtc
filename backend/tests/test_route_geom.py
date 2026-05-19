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

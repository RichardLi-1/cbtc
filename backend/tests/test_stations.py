"""Station berth layout along the YUS loop."""

from stations import YUS_BERTHS, build_yus_berths
from route_geom import ROUTE_LEN_M


def test_berth_count_matches_route_stations():
    berths = build_yus_berths()
    assert len(berths) == 74  # 38 outbound + 36 inbound (terminus legs use crossovers)


def test_berths_monotone_then_wrap():
    chainages = [b.chainage_m for b in YUS_BERTHS]
    assert chainages[0] == 0.0
    assert chainages[-1] < ROUTE_LEN_M
    assert all(chainages[i] <= chainages[i + 1] for i in range(len(chainages) - 1))

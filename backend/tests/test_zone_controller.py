"""Zone controller assigns finite MA fields."""

from train import Train, TrainCommand
from zone_controller import ZoneController, required_follower_gap_m
from route_geom import ROUTE_LEN_M


def test_required_gap_increases_with_speed():
    low = required_follower_gap_m(10.0, 10.0)
    high = required_follower_gap_m(60.0, 10.0)
    assert high > low


def test_zone_update_sets_slack():
    a = Train(chainage_front_m=0.0, run_number=0)
    b = Train(chainage_front_m=ROUTE_LEN_M * 0.5, run_number=1)
    a.apply_command(TrainCommand(1, 2.0))
    b.apply_command(TrainCommand(1, 2.0))
    ZoneController(ROUTE_LEN_M).update([a, b])
    assert a.leader_run_number == 1
    assert b.leader_run_number == 0
    assert a.gap_to_leader_m > 0

"""ATP caps traction when slack is violated."""

from train import Train, TrainCommand
from zone_controller import ZoneController
from route_geom import ROUTE_LEN_M


def test_atp_reduces_accel_when_tight():
    follower = Train(chainage_front_m=1000.0, run_number=0)
    leader = Train(chainage_front_m=1150.0, run_number=1)  # ~12 m nose-to-tail gap
    follower.speed = 50.0
    leader.speed = 10.0
    follower.apply_command(TrainCommand(1, 3.0))
    leader.apply_command(TrainCommand(1, 2.0))
    ZoneController(ROUTE_LEN_M).update([follower, leader])
    assert follower.atp_slack_m < 20.0
    a_before = follower._traction_accel()
    cap = follower._atp_accel_cap()
    assert cap < a_before

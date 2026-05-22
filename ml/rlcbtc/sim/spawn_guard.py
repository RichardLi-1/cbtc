"""Yard / dispatch berth occupancy before inserting a train at chainage 0."""

from __future__ import annotations

from rlcbtc.sim.track import forward_distance

# Single dispatch berth at loop origin (yard throat).
YARD_CHAINAGE_M = 0.0
# Clear berth if no train front within this forward distance along the ring.
YARD_CLEARANCE_M = 200.0


def is_yard_occupied(world) -> bool:
    """True if any train occupies the yard dispatch berth."""
    if not world.trains:
        return False
    for tr in world.trains.values():
        gap_m = forward_distance(YARD_CHAINAGE_M, tr.chainage_front_m, world.route_len_m)
        if gap_m < YARD_CLEARANCE_M:
            return True
    return False

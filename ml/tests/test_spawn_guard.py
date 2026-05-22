from rlcbtc.safety.shield import ActionShield
from rlcbtc.sim.sim_engine import SimEngine
from rlcbtc.sim.spawn_guard import is_yard_occupied


def test_yard_occupied_when_train_at_dispatch_chainage():
    engine = SimEngine(route_len_m=10_000.0, num_trains=1)
    tr = next(iter(engine.world.trains.values()))
    tr.chainage_front_m = 0.0
    assert is_yard_occupied(engine.world)


def test_spawn_blocked_while_yard_occupied():
    engine = SimEngine(route_len_m=10_000.0, num_trains=1)
    tr = next(iter(engine.world.trains.values()))
    tr.chainage_front_m = 0.0
    n0 = len(engine.world.trains)
    engine.scheduler._since_spawn_sec = 999.0
    engine.scheduler.maybe_spawn(engine.world, 1.0, -60.0)
    assert len(engine.world.trains) == n0

    tr.chainage_front_m = 5_000.0
    engine.scheduler.maybe_spawn(engine.world, 1.0, -60.0)
    assert len(engine.world.trains) == n0 + 1


def test_shield_neutralizes_aggressive_headway_when_yard_full():
    action, meta = ActionShield().apply(
        [-1.0, 0.0],
        {"speed_mps": 10.0, "min_slack_m": 100.0, "yard_occupied": True},
    )
    assert action[0] == 0.0
    assert meta["intervened"]
    assert meta["reason"] == "yard_occupied"

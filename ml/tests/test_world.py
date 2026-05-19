from rlcbtc.sim.world import World


def test_world_step_advances_time():
    w = World(route_len_m=10_000.0, num_trains=3)
    m0 = w.sim_time_sec
    w.step(1.0)
    assert w.sim_time_sec == m0 + 1.0
    assert len(w.trains) == 3

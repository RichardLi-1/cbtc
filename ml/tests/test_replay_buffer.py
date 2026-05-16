from rlcbtc.training.replay_buffer import ReplayStore


def test_replay_store_capacity():
    buf = ReplayStore(capacity=2)
    buf.push(1)
    buf.push(2)
    buf.push(3)
    assert list(buf.items) == [2, 3]
    assert len(buf) == 2

from rlcbtc.sim.sim_engine import SimEngine
from rlcbtc.sim.timetable import TimetableTracker, effective_dwell_sec
from rlcbtc.sim.physics import TrainPhysics


def test_effective_dwell_respects_bias():
    assert effective_dwell_sec(18.0, 10.0) == 28.0
    assert effective_dwell_sec(18.0, -20.0) == 5.0


def test_schedule_delay_grows_when_behind_plan():
    engine = SimEngine(dt_sec=1.0, route_len_m=10_000.0, num_trains=1)
    tr = next(iter(engine.world.trains.values()))
    tr.planned_arrival_sec = engine.world.sim_time_sec - 30.0
    engine.world.timetable.update_enroute_delay(tr, engine.world.sim_time_sec)
    assert tr.schedule_delay_sec >= 30.0


def test_positive_dwell_bias_extends_platform_stop():
    engine = SimEngine(dt_sec=1.0, route_len_m=10_000.0, num_trains=1)
    tr = next(iter(engine.world.trains.values()))
    tr.chainage_front_m = engine.world.track.station_chainages[0]
    tr.speed_kph = 0.0
    engine.apply_dispatch_action([0.0, 1.0])  # dwell_bias = +10s
    engine.tick()
    assert tr.dwell_remaining_sec >= 27.0


def test_longer_episode_produces_nonzero_mean_delay_metric():
    engine = SimEngine(dt_sec=1.0, route_len_m=20_000.0, num_trains=3)
    engine.apply_dispatch_action([0.5, 0.5])
    for _ in range(120):
        engine.tick()
    assert engine.last_metrics.mean_delay_sec > 0.0

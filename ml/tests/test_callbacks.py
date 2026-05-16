from rlcbtc.training.callbacks import MetricsCallback


def test_metrics_callback_counts_steps():
    cb = MetricsCallback()
    cb.on_step()
    cb.on_step()
    assert cb.steps == 2

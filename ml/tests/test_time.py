from rlcbtc.utils.time import seconds_to_hms


def test_seconds_to_hms_clamps_negative():
    assert seconds_to_hms(-5) == '00:00:00'

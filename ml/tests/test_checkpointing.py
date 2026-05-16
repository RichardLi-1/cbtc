from pathlib import Path

from rlcbtc.training.checkpointing import latest_checkpoint


def test_latest_checkpoint_none(tmp_path: Path):
    assert latest_checkpoint(tmp_path) is None

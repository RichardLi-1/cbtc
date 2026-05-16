import pytest

from rlcbtc.utils.config import load_yaml


def test_load_yaml_missing(tmp_path):
    with pytest.raises(FileNotFoundError):
        load_yaml(str(tmp_path / "missing.yaml"))

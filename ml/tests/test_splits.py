import pytest

from rlcbtc.data.splits import split_train_eval


def test_split_train_eval_ratio():
    train, eval_ = split_train_eval(list(range(10)), ratio=0.8)
    assert len(train) == 8
    assert len(eval_) == 2


def test_split_invalid_ratio():
    with pytest.raises(ValueError):
        split_train_eval([1, 2], ratio=1.0)

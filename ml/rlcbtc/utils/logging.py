"""CLI and training logs: stderr for the operator, train.log under the run dir."""

from __future__ import annotations

import logging
from pathlib import Path

_ROOT = "rlcbtc"


def configure_logging(*, run_dir: Path | None = None, verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    fmt = logging.Formatter("%(asctime)s %(levelname)s [%(name)s] %(message)s")

    root = logging.getLogger(_ROOT)
    root.handlers.clear()
    root.setLevel(level)
    root.propagate = False

    stream = logging.StreamHandler()
    stream.setLevel(level)
    stream.setFormatter(fmt)
    root.addHandler(stream)

    if run_dir is not None:
        run_dir.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(run_dir / "train.log", mode="w", encoding="utf-8")
        file_handler.setLevel(level)
        file_handler.setFormatter(fmt)
        root.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"{_ROOT}.{name}")

from __future__ import annotations

import threading
from pathlib import Path

from rlcbtc.experiments.runner import ExperimentRunner
from rlcbtc.training.callbacks import clear_training_stop, request_training_stop
from rlcbtc.training.checkpointing import load_training_state
from rlcbtc.utils.config import load_yaml


class TrainingJob:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._run_dir: Path | None = None
        self._error: str | None = None

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def status(self) -> dict:
        with self._lock:
            run_dir = self._run_dir
            err = self._error
            running = self.is_running()
        if run_dir is None:
            return {"status": "idle", "running": running, "error": err}
        state = load_training_state(run_dir)
        return {
            "running": running,
            "run_dir": str(run_dir),
            "error": err,
            **state,
        }

    def start(
        self,
        config_path: Path,
        *,
        resume: bool = False,
        persist_checkpoints: bool = True,
    ) -> dict:
        with self._lock:
            if self.is_running():
                raise RuntimeError("training already running")
            self._error = None

        cfg = load_yaml(config_path)
        cfg.setdefault("training", {})
        cfg["training"]["persist_checkpoints"] = persist_checkpoints
        cfg["training"]["resume"] = resume

        run_dir = Path("runs") / cfg["name"] / "latest"
        runner = ExperimentRunner(cfg, run_dir)

        def _run() -> None:
            try:
                runner.train(resume=resume)
            except Exception as exc:
                with self._lock:
                    self._error = str(exc)
            finally:
                with self._lock:
                    self._thread = None

        clear_training_stop()
        thread = threading.Thread(target=_run, daemon=True, name="rl-training")
        with self._lock:
            self._run_dir = run_dir
            self._thread = thread
        thread.start()
        return self.status()

    def stop(self) -> dict:
        request_training_stop()
        return self.status()

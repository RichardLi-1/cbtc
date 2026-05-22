from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rlcbtc.api.job import TrainingJob

app = FastAPI(title="rlcbtc-training-api")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_job = TrainingJob()
_ML_ROOT = Path(__file__).resolve().parents[2]
_CONFIGS = _ML_ROOT / "configs" / "experiments"


class TrainingStartBody(BaseModel):
    config: str = Field(default="ppo_smoke.yaml", description="Experiment yaml under configs/experiments/")
    resume: bool = False
    persist_checkpoints: bool = True


@app.get("/ml/health")
def health():
    return {"ok": True, "service": "rlcbtc-training"}


@app.get("/ml/training/status")
def training_status():
    return _job.status()


@app.post("/ml/training/start")
def training_start(body: TrainingStartBody):
    config_path = _CONFIGS / body.config
    if not config_path.exists():
        raise HTTPException(status_code=404, detail=f"config not found: {body.config}")
    try:
        return _job.start(
            config_path,
            resume=body.resume,
            persist_checkpoints=body.persist_checkpoints,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/ml/training/stop")
def training_stop():
    return _job.stop()

from dataclasses import dataclass


@dataclass
class TrainState:
    train_id: str
    position_m: float
    speed_mps: float
    authority_limit_m: float


@dataclass
class StationState:
    station_id: str
    dwell_target_sec: int

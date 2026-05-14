from dataclasses import dataclass


@dataclass
class TrainEvent:
    t_sec: int
    event_type: str
    payload: dict

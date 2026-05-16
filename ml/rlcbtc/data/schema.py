from pydantic import BaseModel


class EventRow(BaseModel):
    t_sec: int
    train_id: str
    event_type: str
    delay_sec: float = 0.0

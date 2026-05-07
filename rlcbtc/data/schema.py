from pydantic import BaseModel


class EventRow(BaseModel):
    t_sec: int
    train_id: str
    event_type: str

from dataclasses import dataclass


@dataclass
class LineModel:
    station_count: int
    route_length_km: float

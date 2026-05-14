from dataclasses import dataclass


@dataclass
class Constraints:
    max_speed_mps: float = 22.2
    min_headway_sec: float = 75
    min_authority_buffer_m: float = 60
    braking_margin_m: float = 35

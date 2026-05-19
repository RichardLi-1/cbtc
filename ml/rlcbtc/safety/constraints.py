from dataclasses import dataclass


@dataclass
class Constraints:
    max_speed_mps: float = 24.5  # ~88 kph, matches traction curve ceiling
    min_headway_sec: float = 75
    min_authority_buffer_m: float = 60
    braking_margin_m: float = 35
    max_accel_mps2: float = 1.2

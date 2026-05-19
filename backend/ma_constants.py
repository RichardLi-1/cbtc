"""Moving-block spacing sketch (engineering-style, not vendor data)."""

# Toronto Rocket–class deceleration (m/s^2), ATP / emergency shorthand.
SERVICE_DECEL_MPS2 = 1.35
EMERGENCY_DECEL_MPS2 = 1.5

URBALIS_MA_CYCLE_S = 0.5
URBALIS_FIXED_MARGIN_M = 10.0
URBALIS_GUARANTEED_DECEL_MPS2 = EMERGENCY_DECEL_MPS2

KPH_TO_MPS = 1000.0 / 3600.0
MPS_TO_KPH = 3600.0 / 1000.0

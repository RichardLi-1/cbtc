from backend.sim import DT


TORONTO_ROCKET_ACCELERATION_CURVE = [
    (0, 0.8),
    (10, 0.8),
    (20, 0.75),
    (30, 0.6),
    (40, 0.5),
    (50, 0.4),
    (60, 0.3),
    (70, 0.2),
    (80, 0.1),
] #m/s^2

TORONTO_ROCKET_DECELERATION = 1.35
TORONTO_ROCKET_DECELERATION_EMERGENCY = 1.5

class Train:
    def __init__(self):
        self.position = 0.0
        self.speed = 0.0
        self.acceleration_level = 0.0 # max -5 to 3. 1 = inch, 2 = series, 3 = parallel
        self.acceleration = 0.0 # m/s^2
        self.direction = 1 # 1 for forward, -1 for backward


    def apply_command(self, command):
        self.direction = command.direction
        self.speed = command.speed
        self.brake = command.brake

    def step(self, DT): # THIS IS HOW THE TRAIN STEPS ITS STATE

        self.position += self.speed * DT
        self.speed += (self.acceleration - self.brake * DT)

        #calculate acceleration using existing speed, acceleration curve, and acceleration level

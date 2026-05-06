from backend.sim import DT
from bisect import bisect_right
from dataclasses import dataclass
from time import sleep

@dataclass
class TrainCommand:
    direction: int
    acceleration_level: float
    e_brake: bool = False

#using classes or dataclasses allows for attribute access

TR_ACCELERATION_CURVE = [
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
        self.e_brake = False

        self.acceleration_curve = TR_ACCELERATION_CURVE


    def apply_command(self, command):
        self.direction = command.direction
        self.e_brake = command.e_brake
        self.acceleration_level = command.acceleration_level

    def step(self, DT): # THIS IS HOW THE TRAIN STEPS ITS STATE

        self.position += self.speed * DT
        self.speed += (self.acceleration * DT)

        speeds = [speed for speed, _ in self.acceleration_curve] # _ to ignore value
        x0 = bisect_right(speeds, self.speed) - 1
        x1 = x0 + 1 if x0 < len(speeds) - 1 else x0
        s0 = speeds[x0]
        s1 = speeds[x1]
        fx0 = self.acceleration_curve[x0][1]
        fx1 = self.acceleration_curve[x1][1]
        self.acceleration = fx0 + ((fx1-fx0)/(s1-s0))*(self.speed-s0)

        #calculate acceleration using existing speed, acceleration curve, and acceleration level

        print(f"Speed: {self.speed}, Acceleration: {self.acceleration}")


if __name__ == "__main__":
    train1 = Train()
    train1.apply_command(TrainCommand(direction=1, acceleration_level=1, e_brake=False))
    for i in range(100000):
        train1.step(DT)
        sleep(DT/4)
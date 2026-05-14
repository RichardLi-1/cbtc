from sim import DT
from bisect import bisect_right
from dataclasses import dataclass
from time import sleep
from typing import Any
import json

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
    (88, 0.05),
]  # speed in kph, acceleration in m/s^2

TORONTO_ROCKET_DECELERATION = 1.35
TORONTO_ROCKET_DECELERATION_EMERGENCY = 1.5

# Urbalis 400–style moving-block spacing (simplified public CBTC pattern, not OEM data).
# Required rear→front separation so the follower can stop after MA latency, with a
# fixed odometry / coupling margin. Uses a single guaranteed emergency deceleration.
URBALIS_MA_CYCLE_S = 0.5  # MA / comms refresh order of magnitude (~250–500 ms class systems)
URBALIS_FIXED_MARGIN_M = 10.0  # positioning uncertainty + mechanical buffer (tunable)
URBALIS_GUARANTEED_DECEL_MPS2 = TORONTO_ROCKET_DECELERATION_EMERGENCY

# Curve speed keys are kph; accelerations are m/s². Integrate position in meters.
KPH_TO_MPS = 1000.0 / 3600.0  # kph → m/s
MPS_TO_KPH = 3600.0 / 1000.0  # m/s → kph

class Train:
    def __init__(self, position=0.0, direction=1, run_number=None):
        self.position = position
        self.speed = 0.0  # kph
        self.acceleration_level = 0.0 # max -5 to 3. 1 = inch, 2 = series, 3 = parallel
        self.acceleration = 0.0 # m/s^2
        self.direction = direction # 1 for forward, -1 for backward
        self.e_brake = False
        self.run_number = run_number

        self.acceleration_curve = TR_ACCELERATION_CURVE


    def apply_command(self, command):
        self.direction = command.direction
        self.e_brake = command.e_brake
        self.acceleration_level = command.acceleration_level

    def step(self, DT): # THIS IS HOW THE TRAIN STEPS ITS STATE

        self.position += (self.speed * KPH_TO_MPS) * DT * self.direction
        self.speed += self.acceleration * DT * MPS_TO_KPH

        speeds = [speed for speed, _ in self.acceleration_curve] # _ to ignore value
        x0 = bisect_right(speeds, self.speed) - 1
        x1 = x0 + 1 if x0 < len(speeds) - 1 else x0

        if x0 == x1: #if the speed is past the highest point on acceleration curve
            self.acceleration = 0
        else:
            s0 = speeds[x0]
            s1 = speeds[x1]
            fx0 = self.acceleration_curve[x0][1]
            fx1 = self.acceleration_curve[x1][1]
            self.acceleration = (fx0 + ((fx1-fx0)/(s1-s0))*(self.speed-s0)) * (self.acceleration_level/3.0)

        #calculate acceleration using existing speed, acceleration curve, and acceleration level

        print(
            f"Run {self.run_number} at "
            f"Position: {self.position} m, "
            f"Speed: {self.speed} kph, "
            f"Acceleration: {self.acceleration} m/s^2"
        )

class Line:
    def __init__(self, name):
        self.trains = []
        self.name = name
        
        self.dispatchTrain()


    def step(self, DT):
        for i in range(len(self.trains)):
            self.trains[i].step(DT)
            
            #if there is a train ahead
            if i>0:
                self.calculateSafeDistance(self.trains[i], self.trains[i-1])
        sleep(DT/3)
        print(self.name + " stepped")
        self.dispatchTrain()

    def dispatchTrain(self):
        newTrain = Train(0.1, 1, len(self.trains))
        newTrain.apply_command(TrainCommand(direction=1, acceleration_level=1, e_brake=False))
        self.trains.append(newTrain)

    def calculateSafeDistance(self, train: Train, trainInFront: Train) -> float:
        """Minimum follower→leader separation (m), Urbalis-style moving-block sketch."""
        v_rear_mps = train.speed * KPH_TO_MPS
        v_front_mps = trainInFront.speed * KPH_TO_MPS
        a = URBALIS_GUARANTEED_DECEL_MPS2
        # Braking distance from current speed if MA ends now (v² = 2as).
        d_brake_rear = (v_rear_mps * v_rear_mps) / (2.0 * a) if a > 0 else 0.0
        # During one MA cycle, net gap closure if rear is faster than front.
        d_close = max(0.0, v_rear_mps - v_front_mps) * URBALIS_MA_CYCLE_S
        safe_distance = URBALIS_FIXED_MARGIN_M + d_close + d_brake_rear

        gap_m = trainInFront.position - train.position
        print(
            f"safe_distance_req={safe_distance:.1f} m "
            f"(gap={gap_m:.1f} m, v_rear={train.speed:.1f} kph, v_front={trainInFront.speed:.1f} kph)"
        )
        return safe_distance


def getState():
    states = []
    for line in lines:
        line_obj = {
            "name": line.name,
            "trains": [
                {
                    "position": train.position,
                    "speed": train.speed,
                    "acceleration": train.acceleration,
                    "acceleration_level": train.acceleration_level,
                    "direction": train.direction,
                    "e_brake": train.e_brake,
                    "run_number": train.run_number,
                }
                for train in line.trains
            ],
        }
        states.append(line_obj)
    payload = [state for state in states]
    return json.dumps(payload)

def _init_lines() -> list['Line']:
    yus = Line("YUS")
    for _ in range(3):
        yus.dispatchTrain()
    return [yus]

lines: list['Line'] = _init_lines()

if __name__ == "__main__":
    for i in range(100000):
        lines[0].step(DT)
import gymnasium as gym
import numpy as np
from gymnasium import spaces
from rlcbtc.sim.sim_engine import SimEngine


class DispatchEnv(gym.Env):
    metadata = {'render_modes': []}

    def __init__(self, horizon_steps: int = 3600):
        self.horizon_steps = horizon_steps
        self.engine = SimEngine()
        self.t = 0
        self.action_space = spaces.Box(low=-1.0, high=1.0, shape=(2,), dtype=np.float32)
        self.observation_space = spaces.Box(low=-1e6, high=1e6, shape=(16,), dtype=np.float32)

    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.t = 0
        obs = np.zeros((16,), dtype=np.float32)
        return obs, {}

    def step(self, action):
        self.engine.tick()
        self.t += 1
        obs = np.zeros((16,), dtype=np.float32)
        reward = 0.0
        terminated = self.t >= self.horizon_steps
        truncated = False
        info = {'raw_action': action}
        return obs, reward, terminated, truncated, info

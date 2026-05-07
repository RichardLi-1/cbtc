from stable_baselines3 import SAC
from rlcbtc.envs.dispatch_env import DispatchEnv


class SACTrainer:
    def __init__(self, total_timesteps: int):
        self.total_timesteps = total_timesteps

    def train(self):
        env = DispatchEnv()
        model = SAC('MlpPolicy', env, verbose=0)
        model.learn(total_timesteps=self.total_timesteps)
        return model

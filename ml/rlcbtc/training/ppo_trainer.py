from stable_baselines3 import PPO
from rlcbtc.envs.dispatch_env import DispatchEnv


class PPOTrainer:
    def __init__(self, total_timesteps: int):
        self.total_timesteps = total_timesteps

    def train(self):
        env = DispatchEnv()
        model = PPO('MlpPolicy', env, verbose=0)
        model.learn(total_timesteps=self.total_timesteps)
        return model

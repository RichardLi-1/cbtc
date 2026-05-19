from stable_baselines3 import PPO

from rlcbtc.envs.dispatch_env import DispatchEnv


class PPOTrainer:
    def __init__(self, total_timesteps: int, learning_rate: float = 3e-4):
        self.total_timesteps = total_timesteps
        self.learning_rate = learning_rate

    def train(self, env: DispatchEnv | None = None):
        env = env or DispatchEnv()
        model = PPO("MlpPolicy", env, learning_rate=self.learning_rate, verbose=0)
        model.learn(total_timesteps=self.total_timesteps)
        return model

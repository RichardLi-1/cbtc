from pathlib import Path
import json
from rlcbtc.training.seed import set_global_seed


class ExperimentRunner:
    def __init__(self, cfg: dict, run_dir: Path):
        self.cfg = cfg
        self.run_dir = run_dir

    def train(self) -> None:
        set_global_seed(int(self.cfg.get('seed', 42)))
        self.run_dir.mkdir(parents=True, exist_ok=True)
        (self.run_dir / 'config.json').write_text(json.dumps(self.cfg, indent=2))
        (self.run_dir / 'train.log').write_text('training pipeline initialized\n')

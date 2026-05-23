# CBTC RL Dispatch System

Reinforcement-learning dispatch research environment for CBTC-style subway operations.  
The project models service dynamics, evaluates dispatch policies against rule-based control, and tracks delay/headway/safety outcomes in repeatable simulation runs.

## Features

- Gymnasium-compatible dispatch environment
- PPO and SAC trainer entry points (via Stable-Baselines3)
- Rule-based baseline policy for A/B comparison
- Safety layer hooks for constraint validation and intervention logging
- Config-driven experiments and scenarios
- Evaluation and run-to-run comparison commands

## Project Status

This repository is in active development. Core package structure and command flows are in place, with additional simulation realism and policy logic being expanded iteratively.

## Getting Started

### Requirements

- Python 3.10+

### Setup

From the `ml/` directory:

```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Train a policy

```bash
cd ml
python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml
# resume after interrupt (uses runs/<name>/latest/checkpoints/)
python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml --resume
```

Checkpoints land in `runs/<name>/latest/checkpoints/ppo_<timestep>.zip` plus `training_state.json` for progress.

### Training API (frontend)

```bash
cd ml
python -m rlcbtc.cli.serve_training   # http://127.0.0.1:8001
```

The UI config panel (Ctrl+Shift+C) can start/stop training when this service is running.

### Evaluate a run

```bash
cd ml
python -m rlcbtc.cli.evaluate --run-dir runs/ppo_baseline/latest
```

### Compare RL vs baseline

Both runs should share the same `seed`, env horizon, `dt_seconds`, and `shield_enabled` in `config.json`. Metrics come from each run’s `evaluation.json` (mean delay, headway std, unsafe-action rate). Percentages are computed from those summaries, not hardcoded.

```bash
cd ml
python -m rlcbtc.cli.compare --rl-run runs/ppo_baseline/latest --baseline-run runs/rule_based/latest
# optional: re-run batch eval on both dirs first, then compare
python -m rlcbtc.cli.compare --rl-run runs/ppo_baseline/latest --baseline-run runs/rule_based/latest --re-eval
python -m rlcbtc.cli.report --run-dir runs/ppo_baseline/latest --baseline-run runs/rule_based/latest
```

## Repository Layout

These paths live under `ml/` at the repository root.

- `rlcbtc/`: simulation, environments, policies, safety, training, evaluation, reporting
- `configs/`: experiment/scenario/policy/safety/report configuration files
- `scripts/`: shell wrappers for common train/evaluate/compare/report flows
- `tests/`: smoke and unit tests
- `runs/`: generated artifacts and outputs

## Development

Run tests:

```bash
cd ml
pytest -q
```

Or with Make targets:

```bash
cd ml
make train
make eval
make test
make report
```

## Roadmap

- Expand dispatch environment state/action realism
- Integrate stronger safety-constraint enforcement
- Wire scenario sweeps into experiment configs
- Improve reproducibility and experiment tracking

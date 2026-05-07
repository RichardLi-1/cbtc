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

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Train a policy

```bash
python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml
```

### Evaluate a run

```bash
python -m rlcbtc.cli.evaluate --run-dir runs/ppo_baseline/latest
```

### Compare RL vs baseline

```bash
python -m rlcbtc.cli.compare --rl-run runs/ppo_baseline/latest --baseline-run runs/rule_based/latest
```

## Repository Layout

- `rlcbtc/`: simulation, environments, policies, safety, training, evaluation, reporting
- `configs/`: experiment/scenario/policy/safety/report configuration files
- `scripts/`: shell wrappers for common train/evaluate/compare/report flows
- `tests/`: smoke and unit tests
- `runs/`: generated artifacts and outputs

## Development

Run tests:

```bash
pytest -q
```

Or with Make targets:

```bash
make train
make eval
make test
make report
```

## Roadmap

- Expand dispatch environment state/action realism
- Integrate stronger safety-constraint enforcement
- Add richer metrics and significance analysis
- Improve reproducibility and experiment tracking

# CBTC RL Dispatch Scaffold (Heavy)

This repository now hosts a **realistic RL + CBTC simulator scaffold** designed for rapid iteration, demos, and resume storytelling.

Your original project has been preserved in `legacy_original/` unchanged.

## Quick start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml
python -m rlcbtc.cli.evaluate --run-dir runs/ppo_baseline/latest
```

## What is included

- Event-driven subway simulation primitives
- Gymnasium-compatible RL environment shell
- PPO training/evaluation scaffolding
- Rule-based baseline and comparator
- Safety shielding + violation logging hooks
- Synthetic scenario generation and seeded experiment loops
- Report generation stubs and artifacts layout

## Directory map

- `rlcbtc/` core packages
- `configs/` experiment, scenario, and policy configs
- `scripts/` thin wrappers for reproducible runs
- `tests/` structural and smoke tests
- `runs/` generated artifacts (gitignored)
- `legacy_original/` your previous code

## Notes

- This is intentionally scaffold-heavy: realistic shape, minimal hard coupling.
- Remove by deleting `rlcbtc/`, `configs/`, `scripts/`, `tests/`, and this README.

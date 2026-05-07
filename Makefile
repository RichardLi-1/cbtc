.PHONY: train eval test report

train:
	python -m rlcbtc.cli.train --config configs/experiments/ppo_baseline.yaml

eval:
	python -m rlcbtc.cli.evaluate --run-dir runs/ppo_baseline/latest

test:
	pytest -q

report:
	python -m rlcbtc.cli.report --run-dir runs/ppo_baseline/latest

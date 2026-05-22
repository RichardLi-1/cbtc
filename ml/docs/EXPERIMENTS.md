# Experiment protocol

## Fair comparison (RL vs rule-based)

1. Train or smoke both policies with the **same** `seed`, `env.episode_horizon_steps`, `env.dt_seconds`, and `safety.shield_enabled`.
2. Post-train (or `cli.evaluate`) writes `evaluation.json` plus `traces/` or `eval_traces/steps.jsonl`.
3. `cli.compare` reads both summaries, checks config parity, and writes `comparison.json` with:
   - `delay_reduction_pct`, `headway_std_reduction_pct` (null if baseline mean is zero)
   - per-episode paired deltas + bootstrap CI when traces exist
4. `cli.report` renders `report.md` from `evaluation.json` and `comparison.json` (no placeholder percentages).

Use `--re-eval` on compare to refresh both rollouts from saved configs before diffing.

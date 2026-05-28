# Deployed dispatch policies

Bundled models ship with the app so every user gets the same PPO baseline without retraining.

- `ppo_baseline/policy.zip` — default; override with `RLCBTC_POLICY_PATH`.

Refresh after training:

```bash
cp ml/runs/ppo_baseline/latest/policy.zip ml/models/deployed/ppo_baseline/policy.zip
```

"""Classical headway regulator baseline (no neural net)."""

from __future__ import annotations

import numpy as np


class RuleBasedDispatchPolicy:
    """Push headway up when slack is tight; nudge dwell when headway variance is high."""

    def act(self, obs) -> list[float]:
        arr = np.asarray(obs, dtype=np.float32)
        mean_slack_norm = float(arr[1]) if arr.size > 1 else 0.0
        headway_std_norm = float(arr[2]) if arr.size > 2 else 0.0
        headway_cmd = 0.0
        if mean_slack_norm < 0.05:
            headway_cmd = 0.8
        elif mean_slack_norm > 0.4:
            headway_cmd = -0.3
        dwell_cmd = min(0.5, headway_std_norm)
        return [headway_cmd, dwell_cmd]

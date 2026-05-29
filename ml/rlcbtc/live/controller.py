from __future__ import annotations

from typing import Any, Literal

from rlcbtc.api.dispatch_service import deployed_policy_path
from rlcbtc.live.backend_obs import build_observation_from_snapshot, shield_state_from_snapshot
from rlcbtc.policies.factory import build_policy, load_ppo_policy
from rlcbtc.policies.ppo_policy import PPOPolicyAdapter
from rlcbtc.safety.shield import ActionShield

LiveMode = Literal["rule", "ppo"]


class LiveDispatchController:
    def __init__(self) -> None:
        self.mode: LiveMode = "rule"
        self.headway_bias_sec = 0.0
        self.dwell_bias_sec = 0.0
        self.last_action: list[float] = [0.0, 0.0]
        self.last_intervened = False
        self.last_reason: str | None = None
        self._rule = build_policy("rule_based")
        self._ppo: PPOPolicyAdapter | None = None
        self._shield = ActionShield()

    def set_mode(self, mode: str) -> None:
        if mode not in ("rule", "ppo"):
            raise ValueError("mode must be 'rule' or 'ppo'")
        self.mode = mode  # type: ignore[assignment]

    def policy_ready(self) -> bool:
        return deployed_policy_path().is_file()

    def _ensure_ppo(self) -> PPOPolicyAdapter:
        if self._ppo is None:
            path = deployed_policy_path()
            if not path.is_file():
                raise FileNotFoundError(f"deployed PPO policy missing: {path}")
            self._ppo = load_ppo_policy(path)
        return self._ppo

    def act(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        obs = build_observation_from_snapshot(snapshot)
        if self.mode == "ppo":
            raw = self._ensure_ppo().act(obs)
        else:
            raw = self._rule.act(obs)

        safe, meta = self._shield.apply(raw, shield_state_from_snapshot(snapshot))
        self.headway_bias_sec = float(safe[0]) * 30.0 if len(safe) >= 1 else 0.0
        self.dwell_bias_sec = float(safe[1]) * 10.0 if len(safe) >= 2 else 0.0
        self.last_action = [float(x) for x in safe]
        self.last_intervened = bool(meta.get("intervened"))
        self.last_reason = meta.get("reason")

        return {
            "mode": self.mode,
            "action": self.last_action,
            "headway_bias_sec": self.headway_bias_sec,
            "dwell_bias_sec": self.dwell_bias_sec,
            "shield_intervened": self.last_intervened,
            "shield_reason": self.last_reason,
            "policy_path": str(deployed_policy_path()),
            "policy_ready": self.policy_ready(),
        }

    def status(self) -> dict[str, Any]:
        path = deployed_policy_path()
        return {
            "mode": self.mode,
            "headway_bias_sec": self.headway_bias_sec,
            "dwell_bias_sec": self.dwell_bias_sec,
            "last_action": self.last_action,
            "shield_intervened": self.last_intervened,
            "shield_reason": self.last_reason,
            "policy_ready": path.is_file(),
            "policy_path": str(path),
        }


_controller = LiveDispatchController()


def get_live_controller() -> LiveDispatchController:
    return _controller

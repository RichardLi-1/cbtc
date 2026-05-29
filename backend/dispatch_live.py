"""Live dispatch: call ML API for headway/dwell biases applied in sim.py."""

from __future__ import annotations

import json
import math
import os
import urllib.error
import urllib.request
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sim import Simulation
    import train

ML_API_BASE = os.environ.get("ML_API_BASE", "http://127.0.0.1:8001").rstrip("/")
ACT_INTERVAL_S = float(os.environ.get("DISPATCH_ACT_INTERVAL_S", "2.0"))
DEFAULT_HEADWAY_S = 120.0
MIN_HEADWAY_S = 60.0
DEFAULT_DWELL_S = 18.0


def _rule_fallback_action(mean_slack_norm: float, headway_std_norm: float) -> tuple[float, float]:
    headway_cmd = 0.0
    if mean_slack_norm < 0.05:
        headway_cmd = 0.8
    elif mean_slack_norm > 0.4:
        headway_cmd = -0.3
    dwell_cmd = min(0.5, headway_std_norm)
    return headway_cmd, dwell_cmd


class LiveDispatchBridge:
    def __init__(self) -> None:
        self.mode = "rule"
        self.headway_bias_sec = 0.0
        self.dwell_bias_sec = 0.0
        self.effective_headway_sec = DEFAULT_HEADWAY_S
        self.effective_dwell_sec = DEFAULT_DWELL_S
        self.shield_intervened = False
        self.shield_reason: str | None = None
        self.policy_ready = False
        self.last_error: str | None = None
        self._accum_s = 0.0

    def set_mode(self, mode: str) -> dict[str, Any]:
        if mode not in ("rule", "ppo"):
            raise ValueError("mode must be 'rule' or 'ppo'")
        self.mode = mode
        try:
            return self._post_json("/ml/dispatch/live/mode", {"mode": mode})
        except Exception as exc:
            self.last_error = str(exc)
            if mode == "ppo":
                raise
            return self.status_payload()

    def status_payload(self) -> dict[str, Any]:
        return {
            "policy_mode": self.mode,
            "policy_ready": self.policy_ready,
            "headway_bias_sec": self.headway_bias_sec,
            "dwell_bias_sec": self.dwell_bias_sec,
            "effective_headway_sec": self.effective_headway_sec,
            "effective_dwell_sec": self.effective_dwell_sec,
            "shield_intervened": self.shield_intervened,
            "shield_reason": self.shield_reason,
            "ml_error": self.last_error,
        }

    def _post_json(self, path: str, payload: dict) -> dict[str, Any]:
        url = f"{ML_API_BASE}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def _apply_act_result(self, result: dict[str, Any]) -> None:
        self.headway_bias_sec = float(result.get("headway_bias_sec", 0.0))
        self.dwell_bias_sec = float(result.get("dwell_bias_sec", 0.0))
        self.shield_intervened = bool(result.get("shield_intervened", False))
        self.shield_reason = result.get("shield_reason")
        self.policy_ready = bool(result.get("policy_ready", False))
        self.effective_headway_sec = max(MIN_HEADWAY_S, DEFAULT_HEADWAY_S + self.headway_bias_sec)
        self.effective_dwell_sec = max(5.0, DEFAULT_DWELL_S + self.dwell_bias_sec)
        self.last_error = None

    def _fallback_act(self, snapshot: dict[str, Any]) -> None:
        trains = snapshot.get("trains") or []
        slacks = [float(t.get("atp_slack_m", 500.0)) for t in trains if math.isfinite(float(t.get("atp_slack_m", 500.0)))]
        mean_slack = sum(slacks) / max(len(slacks), 1) if slacks else 500.0
        mean_slack_norm = mean_slack / 500.0
        hw, dwell = _rule_fallback_action(mean_slack_norm, 0.0)
        self.headway_bias_sec = hw * 30.0
        self.dwell_bias_sec = dwell * 10.0
        self.shield_intervened = False
        self.shield_reason = "ml_unreachable"
        self.effective_headway_sec = max(MIN_HEADWAY_S, DEFAULT_HEADWAY_S + self.headway_bias_sec)
        self.effective_dwell_sec = max(5.0, DEFAULT_DWELL_S + self.dwell_bias_sec)

    @staticmethod
    def build_snapshot(simulation: Simulation, line: train.Line) -> dict[str, Any]:
        trains = []
        slacks: list[float] = []
        for tr in line.trains:
            slack = float(tr.atp_slack_m)
            if math.isfinite(slack):
                slacks.append(slack)
            trains.append(
                {
                    "chainage_front_m": float(tr.chainage_front_m),
                    "speed_kph": float(tr.speed),
                    "atp_slack_m": slack,
                    "acceleration_level": float(tr.acceleration_level),
                }
            )
        return {
            "sim_time_s": float(simulation._sim_time_s),
            "route_len_m": float(simulation.route_len_m),
            "trains": trains,
            "yard_occupied": simulation._yard_occupied(line),
            "min_slack_m": min(slacks) if slacks else 500.0,
            "headway_bias_sec": live_dispatch.headway_bias_sec,
            "dwell_bias_sec": live_dispatch.dwell_bias_sec,
            "violations": 0,
            "mean_delay_sec": 0.0,
        }

    def tick(self, simulation: Simulation, line: train.Line, dt: float) -> None:
        self._accum_s += dt
        if self._accum_s < ACT_INTERVAL_S:
            return
        self._accum_s = 0.0

        snapshot = self.build_snapshot(simulation, line)
        try:
            result = self._post_json("/ml/dispatch/live/act", {"snapshot": snapshot, "mode": self.mode})
            self._apply_act_result(result)
        except Exception as exc:
            self.last_error = str(exc)
            if self.mode == "ppo":
                self._fallback_act(snapshot)
            else:
                self._fallback_act(snapshot)


live_dispatch = LiveDispatchBridge()

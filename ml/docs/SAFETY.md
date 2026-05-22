# Safety framework

- constraint validation (`Constraints`: speed, headway, authority buffer)
- shielding via `ActionShield.apply`:
  - fleet speed cap → fallback action
  - low ATP slack + aggressive headway → loosen headway knob
  - yard berth occupied + negative headway (faster spawn) → neutral headway knob
- spawn guard: `HeadwayScheduler` will not insert at chainage 0 while `is_yard_occupied`
- fallback action when shield intervenes
- intervention logging for offline audit

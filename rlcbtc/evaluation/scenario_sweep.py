def build_scenario_ids(n: int) -> list[str]:
    return [f'scenario_{i:04d}' for i in range(n)]

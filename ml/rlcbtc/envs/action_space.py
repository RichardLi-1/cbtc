ACTION_DOC = {
    '0': 'headway correction',
    '1': 'dwell adjustment',
    '2': 'hold at platform',
}


def action_dim() -> int:
    return len(ACTION_DOC)

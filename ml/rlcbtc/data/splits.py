def split_train_eval(items, ratio=0.8):
    if not 0.0 < ratio < 1.0:
        raise ValueError('ratio must be between 0 and 1')
    idx = max(1, int(len(items) * ratio))
    idx = min(idx, len(items) - 1) if len(items) > 1 else idx
    return items[:idx], items[idx:]

def split_train_eval(items, ratio=0.8):
    idx = int(len(items) * ratio)
    return items[:idx], items[idx:]

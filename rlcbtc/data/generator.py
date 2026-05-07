def generate_daily_events(count: int):
    for i in range(count):
        yield {'t_sec': i, 'event_type': 'train_step'}

def get_logger(name: str):
    class _L:
        def info(self, msg):
            _ = (name, msg)

        def warning(self, msg):
            _ = (name, msg)

        def debug(self, msg):
            _ = (name, msg)

    return _L()

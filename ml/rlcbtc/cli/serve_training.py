"""Run the training control API (for frontend / dev)."""

import argparse

import uvicorn


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()
    uvicorn.run("rlcbtc.api.server:app", host=args.host, port=args.port, reload=False)


if __name__ == "__main__":
    main()

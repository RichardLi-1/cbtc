from fastapi import FastAPI, HTTPException

import train
import topology


app = FastAPI()


@app.get("/")
def main():
    print("Hello, World!")


@app.get("/state")
def getState():
    print("Called API to get state")
    res = train.getState()
    return res


@app.get("/topology")
def get_topology():
    return topology.get_topology_document('YUS')




if __name__ == "__main__":
    main()

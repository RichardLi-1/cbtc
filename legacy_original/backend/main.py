from fastapi import FastAPI
import train


app = FastAPI()

@app.get('/')
def main():
    print("Hello, World!")

@app.get('/state')
def getState():
    print("Called API to get state")
    res = train.getState()
    return res




if __name__ == "__main__":
    main()

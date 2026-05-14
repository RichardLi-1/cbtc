import fastapi


app = FastAPI()

@app.get('/')
def main():
    print("Hello, World!")

@app.get('/state')
def getState():
    print("Called API to get state")
    



if __name__ == "__main__":
    main()

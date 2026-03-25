from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/")
async def read_index():
    return FileResponse('frontend/static/index.html')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)

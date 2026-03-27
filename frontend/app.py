import os
import httpx
from fastapi import FastAPI, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from frontend.backends import get_backend_manager

# Load environment variables from .env
load_dotenv()

app = FastAPI()

# Configuration
CONFIG = {
    "ADK_API_URL": os.getenv("ADK_API_URL", "http://127.0.0.1:8000"),
    "GOOGLE_CLOUD_PROJECT": os.getenv("GOOGLE_CLOUD_PROJECT"),
    "GOOGLE_CLOUD_REGION": os.getenv("GOOGLE_CLOUD_REGION", "us-central1"),
    "DEV_AGENT_ENGINE_ID": os.getenv("DEV_AGENT_ENGINE_ID"),
    "STAGING_AGENT_ENGINE_ID": os.getenv("STAGING_AGENT_ENGINE_ID"),
    "PROD_AGENT_ENGINE_ID": os.getenv("PROD_AGENT_ENGINE_ID"),
}

# Serve static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/api/environments")
async def list_environments():
    """List available deployment environments."""
    envs = [
        {"id": "local", "name": "Local (adk web)", "type": "local"}
    ]
    if CONFIG["DEV_AGENT_ENGINE_ID"]:
        envs.append({"id": "dev", "name": "Development (Cloud)", "type": "remote"})
    if CONFIG["STAGING_AGENT_ENGINE_ID"]:
        envs.append({"id": "staging", "name": "Staging (Cloud)", "type": "remote"})
    if CONFIG["PROD_AGENT_ENGINE_ID"]:
        envs.append({"id": "prod", "name": "Production (Cloud)", "type": "remote"})
    
    return {"environments": envs}

@app.get("/api/agents")
async def list_agents(env: str = Query("local")):
    """List agents for a specific environment."""
    try:
        backend = get_backend_manager(env, CONFIG)
        agents = await backend.list_agents()
        return {"agents": agents}
    except Exception as e:
        print(f"Error listing agents for {env}: {e}")
        return {"agents": [], "error": str(e)}

@app.post("/api/sessions")
async def create_session(request: Request, env: str = Query("local")):
    """Create a new session explicitly for the environment."""
    body = await request.json()
    print(f"Creating session for environment: {env}")
    
    try:
        backend = get_backend_manager(env, CONFIG)
        if hasattr(backend, "create_session"):
            session_id = await backend.create_session(body)
            return {"status": "success", "session_id": session_id}
        return {"status": "success"}
    except Exception as e:
        print(f"Session error for {env}: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/chat")
async def proxy_chat(request: Request, env: str = Query("local")):
    """Route the chat request to the selected environment backend."""
    body = await request.json()
    print(f"Routing chat request to environment: {env}")
    
    try:
        backend = get_backend_manager(env, CONFIG)
        return StreamingResponse(
            backend.stream_chat(body), 
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Chat error for {env}: {e}")
        
        async def error_generator():
            yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"
            
        return StreamingResponse(error_generator(), media_type="text/event-stream")

@app.get("/")
async def read_index():
    return FileResponse('frontend/static/index.html')

if __name__ == "__main__":
    import uvicorn
    # Use standard uvicorn run
    uvicorn.run(app, host="0.0.0.0", port=3000)

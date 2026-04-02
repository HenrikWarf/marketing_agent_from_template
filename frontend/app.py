import os
import json
import sqlite3
import uuid
from fastapi import FastAPI, Request, Query
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from frontend.backends import get_backend_manager

# Load environment variables from .env
load_dotenv()

app = FastAPI()

# Add CORS middleware for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    try:
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
    except Exception as e:
        print(f"Error in list_environments: {e}")
        return {"environments": [], "error": str(e)}

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

@app.get("/api/context")
async def get_company_context():
    """Fetch company profile and mission."""
    from agents.marketing_agent.company_context import COMPANY_CONTEXT
    return {"content": COMPANY_CONTEXT}

@app.get("/api/guidelines")
async def get_brand_guidelines():
    """Fetch content generation guidelines."""
    try:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(root, "agents", "marketing_agent", "brand_guidelines.md")
        with open(path, "r") as f:
            return {"content": f.read()}
    except Exception as e:
        print(f"Error reading guidelines: {e}")
        return {"error": str(e)}

@app.get("/api/schema")
async def get_customer_schema():
    """Fetch BigQuery customer table schema."""
    try:
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        path = os.path.join(root, "agents", "marketing_agent", "marketing_schema.json")
        with open(path, "r") as f:
            return {"schema": json.load(f)}
    except Exception as e:
        print(f"Error reading schema: {e}")
        return {"error": str(e)}

@app.post("/api/activate")
async def activate_campaign(request: Request):
    """Save an approved campaign configuration to the local database."""
    try:
        body = await request.json()
        campaign_id = str(uuid.uuid4())[:8]
        
        conn = sqlite3.connect('campaigns.db')
        c = conn.cursor()
        c.execute(
            "INSERT INTO campaigns (id, name, strategy_json, segments_json, content_json) VALUES (?, ?, ?, ?, ?)",
            (
                campaign_id,
                body.get("name", "Unnamed Campaign"),
                json.dumps(body.get("strategy", {})),
                json.dumps(body.get("segments", [])),
                json.dumps(body.get("content", {}))
            )
        )
        conn.commit()
        conn.close()
        
        return {
            "status": "success", 
            "campaign_id": campaign_id, 
            "url": f"http://localhost:3000/api/activated-campaigns/{campaign_id}"
        }
    except Exception as e:
        print(f"Activation Error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/activated-campaigns")
async def list_activated_campaigns():
    """Fetch all activated campaigns from the local database."""
    try:
        conn = sqlite3.connect('campaigns.db')
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT id, name, created_at FROM campaigns ORDER BY created_at DESC")
        rows = c.fetchall()
        conn.close()
        
        return {
            "campaigns": [
                {"id": row["id"], "name": row["name"], "created_at": row["created_at"]}
                for row in rows
            ]
        }
    except Exception as e:
        print(f"Error listing campaigns: {e}")
        return {"error": str(e)}

@app.get("/api/activated-campaigns/{campaign_id}")
async def get_activated_campaign(campaign_id: str):
    """Public API to fetch campaign material for downstream activation tools."""
    try:
        conn = sqlite3.connect('campaigns.db')
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM campaigns WHERE id = ?", (campaign_id,))
        row = c.fetchone()
        conn.close()
        
        if not row:
            return {"error": "Campaign not found"}
            
        return {
            "id": row["id"],
            "name": row["name"],
            "activated_at": row["created_at"],
            "strategy": json.loads(row["strategy_json"]),
            "segments": json.loads(row["segments_json"]),
            "content": json.loads(row["content_json"])
        }
    except Exception as e:
        return {"error": str(e)}

@app.delete("/api/activated-campaigns/{campaign_id}")
async def delete_activated_campaign(campaign_id: str):
    """Remove a campaign from the local database."""
    try:
        conn = sqlite3.connect('campaigns.db')
        c = conn.cursor()
        c.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Campaign {campaign_id} deleted."}
    except Exception as e:
        print(f"Delete Error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/sessions")
async def create_session(request: Request, env: str = Query("local")):
    """Create a new session explicitly for the environment."""
    body = await request.json()
    app_name = body.get("app_name")
    
    if not app_name:
        print(f"Validation Error: No app_name provided for {env} session")
        return {"status": "error", "message": "No agent selected"}
        
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
    app_name = body.get("app_name")
    
    if not app_name:
        async def error_generator():
            yield f"data: {{\"error\": \"No agent selected\"}}\n\n"
        return StreamingResponse(error_generator(), media_type="text/event-stream")

    try:
        backend = get_backend_manager(env, CONFIG)
        return StreamingResponse(
            backend.stream_chat(body), 
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Chat error for {env}: {e}")
        async def error_generator(error_msg: str):
            yield f"data: {{\"error\": \"{error_msg}\"}}\n\n"
        return StreamingResponse(error_generator(str(e)), media_type="text/event-stream")

@app.get("/")
async def read_index():
    return FileResponse('frontend/static/index.html')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)

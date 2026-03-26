import os
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

# ADK API Server address (usually started via 'make playground' or 'adk web')
ADK_API_URL = os.getenv("ADK_API_URL", "http://127.0.0.1:8000")

# Serve static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/api/agents")
async def list_agents():
    """Proxy agent discovery to the ADK API server."""
    try:
        async with httpx.AsyncClient() as client:
            # ADK has a /list-apps endpoint
            response = await client.get(f"{ADK_API_URL}/list-apps")
            if response.status_code == 200:
                data = response.json()
                # Format: ["agent1", "agent2"] -> [{"id": "agent1", "name": "Agent1"}]
                return {
                    "agents": [
                        {"id": name, "name": name.replace("_", " ").title()}
                        for name in data
                    ]
                }
    except Exception as e:
        print(f"Error connecting to ADK API server: {e}")
    
    # Fallback to local discovery if ADK server is down
    agents_dir = os.path.join(os.getcwd(), "agents")
    agents = []
    if os.path.exists(agents_dir):
        for item in os.listdir(agents_dir):
            item_path = os.path.join(agents_dir, item)
            if os.path.isdir(item_path) and \
               os.path.exists(os.path.join(item_path, "agent.py")) and \
               not item.startswith((".", "__")) and \
               item not in ["shared", "app_utils"]:
                agents.append({"id": item, "name": item.replace("_", " ").title()})
    return {"agents": sorted(agents, key=lambda x: x["name"])}

@app.post("/api/chat")
async def proxy_chat(request: Request):
    """Proxy the chat request to the ADK API server's /run_sse endpoint."""
    body = await request.json()
    print(f"Proxying request to {ADK_API_URL}/run_sse for agent: {body.get('app_name')}")
    
    async def stream_generator():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST", 
                    f"{ADK_API_URL}/run_sse", 
                    json=body,
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    print(f"ADK response status: {response.status_code}")
                    if response.status_code != 200:
                        error_detail = await response.aread()
                        print(f"ADK error response: {error_detail.decode()}")
                        yield f"data: {{\"error\": \"ADK Server returned {response.status_code}\"}}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            # print(f"Streaming line: {line[:50]}...") # Debug log
                            yield f"{line}\n\n"
        except Exception as e:
            print(f"Proxy error: {e}")
            yield f"data: {{\"error\": \"Proxy error: {str(e)}\"}}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@app.get("/")
async def read_index():
    return FileResponse('frontend/static/index.html')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)

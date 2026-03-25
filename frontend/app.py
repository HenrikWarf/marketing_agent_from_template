from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI()

# Serve static files
app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

@app.get("/api/agents")
async def list_agents():
    """Discover available agents by scanning the agents/ directory."""
    agents_dir = os.path.join(os.getcwd(), "agents")
    agents = []
    
    if not os.path.exists(agents_dir):
        return {"agents": []}
        
    for item in os.listdir(agents_dir):
        item_path = os.path.join(agents_dir, item)
        # An agent is a directory with an agent.py file
        # Exclude internal, shared, and utility directories
        if os.path.isdir(item_path) and \
           os.path.exists(os.path.join(item_path, "agent.py")) and \
           not item.startswith((".", "__")) and \
           item not in ["shared", "app_utils"]:
            
            # Convert snake_case to Title Case for display
            display_name = item.replace("_", " ").title()
            agents.append({"id": item, "name": display_name})
            
    return {"agents": sorted(agents, key=lambda x: x["name"])}

@app.get("/")
async def read_index():
    return FileResponse('frontend/static/index.html')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)

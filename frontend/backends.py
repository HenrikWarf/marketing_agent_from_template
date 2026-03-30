import os
import json
import httpx
import vertexai
from typing import AsyncGenerator, Dict, Any, List

class BaseBackend:
    async def list_agents(self) -> List[Dict[str, str]]:
        raise NotImplementedError

    async def create_session(self, body: Dict[str, Any]) -> str:
        raise NotImplementedError

    async def stream_chat(self, body: Dict[str, Any]) -> AsyncGenerator[str, None]:
        raise NotImplementedError

class LocalBackend(BaseBackend):
    def __init__(self, adk_api_url: str):
        self.adk_api_url = adk_api_url

    async def list_agents(self) -> List[Dict[str, str]]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.adk_api_url}/list-apps")
                if response.status_code == 200:
                    data = response.json()
                    return [
                        {"id": name, "name": name.replace("_", " ").title()}
                        for name in data
                    ]
        except Exception as e:
            print(f"LocalBackend list_agents error: {e}")
        
        # Fallback to local filesystem discovery
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
        return sorted(agents, key=lambda x: x["name"])

    async def create_session(self, body: Dict[str, Any]) -> str:
        # Local backend allows user-provided sessions if sent
        import uuid
        return body.get("session_id") or f"session-{uuid.uuid4().hex[:9]}"

    async def stream_chat(self, body: Dict[str, Any]) -> AsyncGenerator[str, None]:
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST", 
                    f"{self.adk_api_url}/run_sse", 
                    json=body,
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    if response.status_code != 200:
                        error_detail = await response.aread()
                        yield f"data: {{\"error\": \"ADK Server returned {response.status_code}: {error_detail.decode()}\"}}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            yield f"{line}\n\n"
        except Exception as e:
            yield f"data: {{\"error\": \"Local proxy error: {str(e)}\"}}\n\n"

class RemoteBackend(BaseBackend):
    def __init__(self, resource_name: str, project: str, location: str):
        self.resource_name = resource_name
        self.project = project
        self.location = location
        self._engine = None
        self._client = None
        
        # Initialize vertexai for this project/location
        vertexai.init(project=project, location=location)

    def _get_engine(self):
        if not self._engine:
            self._client = vertexai.Client(project=self.project, location=self.location)
            self._engine = self._client.agent_engines.get(name=self.resource_name)
        return self._engine

    async def list_agents(self) -> List[Dict[str, str]]:
        # Remote instances usually host a single "app" or "root_agent"
        # We can extract the name from the resource ID or display name if possible
        display_name = self.resource_name.split("/")[-1]
        return [{"id": "root", "name": f"Remote Agent ({display_name[:8]}...)"}]

    async def create_session(self, body: Dict[str, Any]) -> str:
        """
        Creates a session explicitly in Vertex AI memory. 
        Notes on API behavior:
        1. DO NOT pass a client-generated session_id. `VertexAISessionService` rejects user-provided IDs.
        2. Always use `await engine.async_create_session`. The synchronous `engine.create_session` enforces a 
           strict 10s thread timeout, which crashes with FAILED_PRECONDITION during remote agent cold-starts.
        3. `async_create_session` returns a full dictionary block, not a string. We must parse out ['id'].
        """
        try:
            engine = self._get_engine()
            # Remote backend MUST generate the session ID
            session_data = await engine.async_create_session(
                user_id=body.get("user_id", "user-default")
            )
            if isinstance(session_data, dict):
                return session_data.get("id")
            return session_data
        except Exception as e:
            print(f"RemoteBackend create_session error: {e}")
            raise e

    async def stream_chat(self, body: Dict[str, Any]) -> AsyncGenerator[str, None]:
        try:
            engine = self._get_engine()
            
            # ADK payload structure: { "new_message": { "role": "user", "parts": [...] }, ... }
            # Remote ADK instances expect the 'message' key (not 'input')
            user_input = ""
            new_message = body.get("new_message", {})
            parts = new_message.get("parts", [])
            if parts and "text" in parts[0]:
                user_input = parts[0]["text"]
            
            # Map parameters to what AdkApp expects
            kwargs = {
                "message": user_input,
                "session_id": body.get("session_id"),
                "user_id": body.get("user_id") or "user-default"
            }

            generator = engine.async_stream_query(**kwargs)
            
            try:
                first_chunk = await generator.__anext__()
            except StopAsyncIteration:
                first_chunk = None

            # Handle 498 "Session not found"
            if isinstance(first_chunk, dict) and first_chunk.get("code") in [404, 498] and "Session not found" in first_chunk.get("message", ""):
                print("Session not found, auto-creating session")
                try:
                    new_session_data = await engine.async_create_session(
                        user_id=kwargs["user_id"]
                    )
                    if isinstance(new_session_data, dict):
                        kwargs["session_id"] = new_session_data.get("id")
                    else:
                        kwargs["session_id"] = new_session_data
                except Exception as e:
                    print(f"Auto-create session warning (ignored): {e}")
                
                # Notify UI of the new session ID so it stays in sync
                if kwargs.get("session_id"):
                    yield f"data: {json.dumps({'session_id': kwargs['session_id']})}\n\n"

                # Retry with the new session
                generator = engine.async_stream_query(**kwargs)
                try:
                    first_chunk = await generator.__anext__()
                except StopAsyncIteration:
                    first_chunk = None

            async def combined_stream():
                if first_chunk is not None:
                    yield first_chunk
                async for c in generator:
                    yield c

            async for chunk in combined_stream():
                print(f"DEBUG: Remote chunk type: {type(chunk)}")
                # Map the chunk to the SSE format expected by the UI
                # UI expects data: {"content": {"parts": [{"text": "..."}]}}
                
                # SDK might return Content objects or dicts depending on how it's called
                if hasattr(chunk, "content"):
                    # If it's a Content object
                    content_dict = {"role": chunk.role, "parts": [{"text": p.text} for p in chunk.parts if hasattr(p, "text")]}
                    yield f"data: {json.dumps({'content': content_dict})}\n\n"
                elif isinstance(chunk, dict):
                    # ADK usually returns dicts when called via the raw execution API
                    # The format is often already the event dict
                    if "content" in chunk:
                        yield f"data: {json.dumps(chunk)}\n\n"
                    elif "text" in chunk:
                        # Sometimes it's just a text chunk
                        yield f"data: {json.dumps({'content': {'parts': [{'text': chunk['text']}]}})}\n\n"
                    else:
                        # Fallback for other dict structures
                        yield f"data: {json.dumps({'content': {'parts': [{'text': str(chunk)}]}})}\n\n"
                elif isinstance(chunk, str):
                    # Simple text chunk
                    yield f"data: {json.dumps({'content': {'parts': [{'text': chunk}]}})}\n\n"
                else:
                    # Try to serialize whatever it is
                    yield f"data: {json.dumps({'content': {'parts': [{'text': str(chunk)}]}})}\n\n"

                    
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"RemoteBackend stream_chat error: {e}")
            yield f"data: {{\"error\": \"Remote engine error: {str(e)}\"}}\n\n"

def get_backend_manager(env_id: str, config: Dict[str, Any]) -> BaseBackend:
    if env_id == "local":
        return LocalBackend(config.get("ADK_API_URL", "http://127.0.0.1:8000"))
    
    resource_name = config.get(f"{env_id.upper()}_AGENT_ENGINE_ID")
    if not resource_name:
        raise ValueError(f"No Agent Engine ID configured for environment: {env_id}")
        
    return RemoteBackend(
        resource_name=resource_name,
        project=config.get("GOOGLE_CLOUD_PROJECT"),
        location=config.get("GOOGLE_CLOUD_REGION", "us-central1")
    )

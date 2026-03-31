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
                    if data:
                        # Filter out known utility/shared directories that aren't agents
                        return [
                            {"id": name, "name": name.replace("_", " ").title()}
                            for name in data
                            if name not in ["shared", "app_utils", "shared_tools"]
                        ]
        except Exception as e:
            print(f"LocalBackend list_agents error: {e}")
        
        # Fallback to local filesystem discovery
        agents_dir = os.path.join(os.getcwd(), "agents")
        agents = []
        if os.path.exists(agents_dir):
            # Check for agents/marketing_agent directly if it's the primary one
            if os.path.exists(os.path.join(agents_dir, "marketing_agent", "agent.py")):
                agents.append({"id": "marketing_agent", "name": "Marketing Manager"})
            
            # Search for others
            for item in os.listdir(agents_dir):
                item_path = os.path.join(agents_dir, item)
                if os.path.isdir(item_path) and \
                   os.path.exists(os.path.join(item_path, "agent.py")) and \
                   not item.startswith((".", "__")) and \
                   item not in ["shared", "app_utils", "marketing_agent"]:
                    agents.append({"id": item, "name": item.replace("_", " ").title()})
        
        # If still empty, the server might be running against a single agent dir
        if not agents:
            # Default to the primary agent if nothing else is found
            return [{"id": "marketing_agent", "name": "Marketing Manager"}]
            
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
        2. AgentEngine objects often use 'create_session' (synchronous) or handle it internally.
        """
        try:
            engine = self._get_engine()
            # Try to create session using the synchronous method if async is missing
            if hasattr(engine, "create_session"):
                session_data = engine.create_session(
                    user_id=body.get("user_id", "user-default")
                )
                if isinstance(session_data, dict):
                    return session_data.get("id")
                return getattr(session_data, "id", session_data)
            
            # Fallback: Just return a placeholder or None, letting stream_chat handle it
            print("Warning: engine.create_session not found, session will be handled during chat")
            return None
        except Exception as e:
            print(f"RemoteBackend create_session error: {e}")
            raise e

    async def stream_chat(self, body: Dict[str, Any]) -> AsyncGenerator[str, None]:
        try:
            engine = self._get_engine()
            
            # ADK payload structure: { "new_message": { "role": "user", "parts": [...] }, ... }
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

            # Remote ADK instances expose async_stream_query
            generator = engine.async_stream_query(**kwargs)
            
            try:
                first_chunk = await generator.__anext__()
            except StopAsyncIteration:
                first_chunk = None

            # Handle 498 "Session not found" or 404
            if isinstance(first_chunk, dict) and first_chunk.get("code") in [404, 498] and "Session not found" in first_chunk.get("message", ""):
                print("Session not found, auto-creating session")
                try:
                    if hasattr(engine, "create_session"):
                        new_session_data = engine.create_session(
                            user_id=kwargs["user_id"]
                        )
                        if isinstance(new_session_data, dict):
                            kwargs["session_id"] = new_session_data.get("id")
                        else:
                            kwargs["session_id"] = getattr(new_session_data, "id", new_session_data)
                    else:
                        # Clear session ID and let the server auto-create
                        kwargs["session_id"] = None
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

            class DefaultEncoder(json.JSONEncoder):
                def default(self, obj):
                    if hasattr(obj, "model_dump"):
                        return obj.model_dump()
                    if hasattr(obj, "to_dict"):
                        return obj.to_dict()
                    # Handle Enums
                    import enum
                    if isinstance(obj, enum.Enum):
                        return obj.value
                    return str(obj)

            async for chunk in combined_stream():
                # ADK Event objects or dicts
                if hasattr(chunk, "model_dump"):
                    yield f"data: {json.dumps(chunk.model_dump(), cls=DefaultEncoder)}\n\n"
                elif hasattr(chunk, "to_dict"):
                    yield f"data: {json.dumps(chunk.to_dict(), cls=DefaultEncoder)}\n\n"
                elif isinstance(chunk, dict):
                    # Ensure we pass through metadata for breadcrumbs if it's there
                    metadata_keys = ["agent_name", "agentName", "tool_call", "toolCall", "tool_calls", "toolCalls", "tool_response", "toolResponse", "tool_call_result", "toolCallResult"]
                    if any(k in chunk for k in metadata_keys):
                        yield f"data: {json.dumps(chunk, cls=DefaultEncoder)}\n\n"
                    elif "content" in chunk:
                        yield f"data: {json.dumps(chunk, cls=DefaultEncoder)}\n\n"
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

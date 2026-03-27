# Gemini CLI Project Mandates - ADK Agent Template

This file contains foundational mandates and technical instructions for Gemini CLI when working on this project. These instructions take precedence over general workflows.

## Project Overview
A base template for building ADK agents with multiple architectural patterns (Simple, Subagent, Sequential, Loop) and tool integrations (Pure Functions, MCP, Google Search). It includes a full developer flow (Local -> Dev -> Staging -> Prod) and a custom Chat UI.

## Engineering Standards

### ADK & Deployment Specifics
- **Agent Discovery**: Every agent must reside in its own subdirectory under `agents/` (e.g., `agents/my_agent/`).
- **Exposing Agents**: Each agent directory must have an `__init__.py` that exposes `root_agent`.
- **Main Entrypoint**: `agents/agent.py` is the primary entrypoint for Agent Engine deployment. It should wrap the desired `root_agent` in an `App` instance.
- **Naming**: The main agent instance in `agent.py` must be named `root_agent` for `adk web` and `adk eval` compatibility.
- **Tools**: 
  - Use `google.adk.tools.FunctionTool` to wrap Python functions.
  - Use `google.adk.tools.google_search` for grounding.
- **Sub-agents**: Use the `sub_agents` parameter (not `agents`) when linking child agents to a root agent.

### Developer Flow (Multi-Environment)
- **Local Development**: Use `make playground` for the ADK UI and `make ui` for the custom Chat UI.
- **Remote Dev (Sandbox)**: Use `make deploy-dev` for manual testing on managed infrastructure.
- **CI/CD Promotion**:
    - **PR Checks**: Automatically run `make lint` and `make test`.
    - **Staging**: Merge to `main` triggers Terraform and deployment to Staging, followed by Load Tests.
    - **Production**: Promotion to Production requires Manual Approval in GitHub Actions.
- **Infrastructure**: All GCP resources (IAM, Service Accounts, WIF) must be managed via Terraform in `deployment/terraform/`.

### Quality & Testing
- **Validation**: Every change must be verified by running `make lint`, `make test`, and `make eval`.
- **Evals**: Prioritize behavioral testing via `adk eval`. Follow the **Eval-Fix loop** described in `README.md`.
- **Load Testing**: Use Locust (`tests/load_test/`) to verify stability before production promotion.

### Frontend (Custom UI)
- **Architecture**: A FastAPI server (`frontend/app.py`) serves a static HTML/JS chat interface (`frontend/static/index.html`). Backend routing logic lives in `frontend/backends.py`.
- **Communication**: Uses SSE (Server-Sent Events) to stream agent responses from the backend.
- **Dual Terminal Requirement**: Locally, both the agent backend (`make playground`) and the UI (`make ui`) must be running.
- **Markdown Rendering**: Agent responses are parsed and rendered as HTML using `marked.js` (loaded from CDN). The `.markdown-body` CSS class handles styling for code blocks, lists, and inline code.
- **Multi-Environment Backend Routing**: `frontend/backends.py` contains `LocalBackend` (proxies to the local ADK API server) and `RemoteBackend` (connects directly to Vertex AI Agent Engine via the `vertexai` SDK). `get_backend_manager(env, config)` selects the correct backend based on the environment.
- **Session Management**: 
  - **Always Backend-Driven**: Remote Vertex AI instances (`VertexAISessionService`) reject user-provided session IDs. The backend must explicitly generate the `session_id` using `engine.async_create_session` and return it to the frontend.
  - **Use Async SDK**: Always use `await engine.async_create_session`. The synchronous `create_session` has a hardcoded 10-second timeout, causing `FAILED_PRECONDITION` exceptions when remote agents take longer to cold-start.
  - **Return Types**: `async_create_session` returns a full Python dictionary (`{"id": "...", ...}`), not a string. Extract `.get("id")` before passing it back into stream requests.
  - **Session Sync**: The backend emits `data: {"session_id": "..."}` SSE events when it auto-creates a session mid-stream. The frontend parses these to keep its local `sessionId` variable in sync.
  - **Initial Session**: The UI automatically triggers `triggerNewSession()` after loading agents to ensure a valid session exists before the user sends their first message.

### Configuration
- **Auth**: Support both `GOOGLE_API_KEY` (AI Studio) and Vertex AI (ADC). Use `.env` for local configuration.
- **Environment**: Always use the virtual environment's Python (`.venv/bin/python`) for running scripts to ensure dependency consistency.

## File Structure Mandates
- **Agents**: `agents/<agent_name>/agent.py`
- **Main App**: `agents/agent.py`
- **Shared Tools**: `agents/shared/tools.py`
- **Custom UI**: `frontend/app.py` and `frontend/static/`
- **Infrastructure**: `deployment/terraform/`
- **Behavioral Evals**: `tests/eval/evalsets/` and `tests/eval/eval_config.json`

## Proactiveness & Intent
- If a behavioral evaluation fails, analyze the failure reasons (hallucination, tool mismatch) and propose prompt refinements in the `agent.py` file.
- Maintain consistency across all four agent examples when updating shared tools or core instructions.

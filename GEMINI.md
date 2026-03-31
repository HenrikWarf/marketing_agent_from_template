# Gemini CLI Project Mandates - ADK Agent Template

This file contains foundational mandates and technical instructions for Gemini CLI when working on this project. These instructions take precedence over general workflows.

## Project Overview
A production-ready base template for building ADK agents with a **Hub-and-Spoke** architecture. It features native BigQuery MCP integration, structured session state management, and a robust multi-environment developer flow (Local -> Dev -> Staging -> Prod).

## Engineering Standards

### ADK & Deployment Specifics
- **Architecture**: Always follow the **Hub-and-Spoke** model documented in `AGENT_DESIGN.md`. Sub-agents must return structured JSON to the hub and never call each other directly.
- **Agent Discovery**: Every agent must reside in its own subdirectory under `agents/` (e.g., `agents/marketing_agent/`).
- **Exposing Agents**: Each agent directory must have an `__init__.py` that exposes `root_agent`.
- **Main Entrypoint**: `agents/agent.py` is the primary entrypoint for Agent Engine deployment. It wraps the `marketing_manager` in an `App` instance.
- **Naming**: The root agent in `agent.py` must be named `root_agent` for `adk web` and `adk eval` compatibility.
- **Sub-agents**: Use the `sub_agents` parameter when linking child agents to the hub.
- **Constraints**: Set `disallow_transfer_to_peers=True` and `disallow_transfer_to_parent=True` for all sub-agents to enforce the hub-and-spoke flow.

### BigQuery & Tooling
- **BigQuery MCP**: Use the `bq_mcp_toolset` in `agents/shared/tools.py`. It uses a hybrid auth model:
    - **Local**: Uses manual header provider with cached Application Default Credentials (ADC).
    - **Remote**: Uses native `use_google_auth=True` for Agent Engine identity delegation.
- **Self-Healing**: Use the `BigQueryReflectRetryPlugin` in `agents/shared/plugins.py` to automatically recover from SQL errors and connection drops.
- **Schema Management**: Keep the BigQuery schema in `agents/marketing_agent/customer_schema.json` and inject it into agent prompts for first-turn accuracy.

### Developer Flow (Multi-Environment)
- **Local Development**: Use `make playground` for the ADK UI and `make ui` for the custom Chat UI.
- **Remote Dev (Sandbox)**: Use `make deploy-dev` for manual testing. This targets the `marketing-agent-app-dev` service account.
- **Infrastructure**: All GCP roles (`roles/mcp.toolUser`, etc.) are managed via Terraform in `deployment/terraform/`.
- **CI/CD**: Merges to `main` trigger Terraform and deployment to Staging.

### Frontend & SSE Proxy
- **Architecture**: A FastAPI server (`frontend/app.py`) proxies requests to either local or remote backends via `frontend/backends.py`.
- **SSE Stream Handling**: The frontend (`index.html`) must intelligently handle SSE chunks. It checks if a chunk is incremental or a full-state update to prevent duplicate message rendering.
- **Session Management**: 
  - **Always Backend-Driven**: Remote Vertex AI instances reject user-provided session IDs.
  - **Synchronous fallback**: Use `engine.create_session` for remote backends as some SDK versions lack the stable `async_create_session` attribute on the `AgentEngine` object.

## Troubleshooting & Resilience (Lessons Learned)

### 1. Unified Authentication Model
- **Issue**: Brittle environment branching (`IS_ON_GCP` checks) often fails across different Vertex AI runtimes where standard env vars (like `K_SERVICE`) may be missing.
- **Fix**: Always use a unified `header_provider` in `agents/shared/tools.py` that relies on `google.auth.default()`.
- **Benefit**: This ensures that local development (ADC) and cloud deployment (Service Account) use identical authentication logic, making local tests a reliable proxy for cloud behavior.

### 2. Handling TaskGroup Crashes
- **Issue**: Transient connection errors in the MCP/Vertex stack often manifest as "unhandled errors in a TaskGroup," which can crash the entire session runner.
- **Fix**: Implement `extract_error_from_exception` in the `BigQueryReflectRetryPlugin`.
- **Benefit**: This catches low-level `TaskGroup` exceptions during tool execution and converts them into "error" feedback for the agent. This triggers the ADK retry logic instead of a session-ending crash.

### 3. Safe Tool Initialization
- **Issue**: Passing `None` or failed toolsets into an `Agent` can cause cryptic crashes during the initialization of the session runner.
- **Fix**: In `agents/marketing_agent/agent.py`, always use an explicit list construction: `data_tools = [bq_mcp_toolset] if bq_mcp_toolset else []`.

## File Structure Mandates
- **Primary Agents**: `agents/marketing_agent/agent.py`
- **Infrastructure**: `deployment/terraform/`
- **Detailed Design**: `AGENT_DESIGN.md`
- **Auth Guide**: `BIGQUERY_MCP_AUTH.md`

## Proactiveness & Intent
- If a behavioral evaluation fails, analyze the failure reasons (hallucination, tool mismatch) and propose prompt refinements.
- Ensure all new sub-agents conform to the `output_schema` and `output_key` patterns for state consistency.

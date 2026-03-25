# ADK Agent Base Template

A comprehensive starting point for building, testing, and deploying agents using the Google ADK (Agent Development Kit). This template includes examples of multiple agent architectures and tooling integrations.

## Features
- **Multiple Agent Types**:
  - `simple_agent`: A direct LLM-based assistant.
  - `subagents_agent`: A root agent coordinating specialized sub-agents.
  - `sequential_agent`: A multi-step sequential processing workflow.
  - `loop_agent`: An iterative agent for refinement tasks.
- **Tooling Examples**:
  - **Pure Functions**: Local Python functions wrapped as ADK tools.
  - **MCP (Model Context Protocol)**: Integration with MCP servers (e.g., local filesystem).
  - **Google Search Grounding**: Real-time search using Google Search.
- **Developer Suite**: Local `adk web` playground, `pytest` for unit testing, and `ruff` for linting.

## Developer Flow

This template follows a robust **Local -> Remote Dev -> Remote Prod** flow.

### 1. Local Development
Iterate on your agent and tools locally.
- **Playground**: `make playground` (interactive test of all agents).
- **Custom UI**: `make ui` (starts a simple chat interface at http://localhost:3000).
- **Checks**: `make lint`, `make test`, `make eval`.

### 2. Deployment to Remote (Manual)
When you are ready to test in a cloud environment:
- **Dev**: `make deploy-dev` (requires `GOOGLE_CLOUD_PROJECT` to be set to your dev project).
- **Prod**: `make deploy-prod` (usually reserved for CI/CD, but available for manual deployment).

### 3. CI/CD (GitHub Actions)
The project is scaffolded with GitHub Actions:
- **PR Checks**: Automatically runs linting and tests on every Pull Request.
- **Staging**: Merging to `main` triggers deployment to your **Staging** Agent Engine.
- **Production**: After staging deployment and testing, a manual approval in GitHub Actions promotes the agent to **Production**.

## Custom Chat UI
A simple, modern chat interface is provided in `frontend/`. 
- To run locally: `make ui`.
- The UI uses SSE (Server-Sent Events) to stream agent responses.
- It can be connected to remote endpoints by updating the `baseUrl` in `frontend/static/index.html`.

## Deployment
This template is designed for easy deployment to Vertex AI Agent Engine. When you are ready to deploy:

```bash
# Use the Agent Starter Pack to add deployment scaffolding
uvx agent-starter-pack enhance . --deployment-target agent_engine
```

## Project Structure
- `agents/`:
  - `simple_agent/`: Basic LLM agent definition.
  - `subagents_agent/`: Example of agent-to-agent delegation.
  - `sequential_agent/`: Example of multi-step processing.
  - `loop_agent/`: Example of iterative refinement.
  - `shared/tools.py`: Shared tooling definitions (Pure functions, MCP, Search).
- `tests/`: Unit tests for agents and tools.
- `Makefile`: Convenience commands for developers.
- `ci.sh`: Script for running all CI checks locally.
- `DESIGN_SPEC.md`: Detailed architecture and goals.

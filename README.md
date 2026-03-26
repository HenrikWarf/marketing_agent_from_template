# Marketing Agent - ADK Orchestration Template

A comprehensive AI-driven marketing system built with the Google ADK (Agent Development Kit). This template demonstrates a sophisticated multi-agent orchestration pattern for automating data-driven marketing workflows—from BigQuery analysis to personalized content creation.

## Features
- **Marketing Multi-Agent Orchestration**:
  - `marketing_orchestrator`: The root agent that coordinates specialized sub-agents to deliver full marketing packages.
  - `analysis_agent`: Fetches and analyzes customer data from BigQuery via MCP tools to identify trends.
  - `segmentation_agent`: Categorizes customers into high-value, churn-risk, or custom marketing segments.
  - `content_agent`: Generates personalized marketing copy (Email, SMS, Ads) tailored to specific segments.
  - `reviewer_agent`: Validates all generated content against brand guidelines and legal compliance.
- **Advanced Tooling**:
  - **MCP (Model Context Protocol)**: Live connection to BigQuery for real-time data analysis.
  - **Google Search Grounding**: Real-time market research and trend validation.
  - **Custom SSE Proxy**: A FastAPI-based custom UI with real-time response streaming and typing indicators.
- **Enterprise Developer Suite**: Integrated `adk web` playground, automated behavioral evals, and full CI/CD pipelines.

## Developer Flow

This template follows a robust **Local -> Remote Dev -> Remote Prod** flow.

### 1. Local Development
Iterate on your agent and tools locally.
- **Setup**: `make setup` followed by `make gcp-setup` to enable APIs and authenticate.
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

#### CI/CD Setup (One-time)
To activate the automated flow, run the following command from your local terminal:
```bash
uvx agent-starter-pack setup-cicd \
  --staging-project YOUR_PROJECT_ID \
  --prod-project YOUR_PROJECT_ID \
  --repository-name adk_base_template \
  --repository-owner HenrikWarf
```
*Note: You can use the same Project ID for both staging and production; the system will create two distinct Agent Engine instances within that project.*

## Alternative Deployment: Cloud Run
While this template defaults to **Agent Engine** (managed), ADK also supports deployment to **Cloud Run**. Cloud Run offers more control over the container environment and scaling but requires a Dockerfile. To switch a project to Cloud Run, you would use:
`uvx agent-starter-pack enhance . --deployment-target cloud_run`

## Custom Chat UI
A simple, modern chat interface is provided in `frontend/`. 
- To run locally: 
  1. Start the agent backend: `make playground`.
  2. In a new terminal, start the UI: `make ui`.
  3. Open http://localhost:3000 in your browser.
- The UI uses SSE (Server-Sent Events) to stream agent responses from the backend.
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

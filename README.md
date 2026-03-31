# Marketing Agent - ADK Orchestration Template

A comprehensive AI-driven marketing system built with the Google ADK (Agent Development Kit). This template demonstrates a sophisticated **Hub-and-Spoke** multi-agent orchestration pattern for automating data-driven marketing workflows—from BigQuery analysis to personalized content creation.

## Features
- **Hub-and-Spoke Orchestration**:
  - `marketing_manager`: The central hub that manages state, monitors the "Blackboard," and coordinates experts.
  - `analysis_agent`: Fetches and analyzes customer data from BigQuery via native MCP integration.
  - `segmentation_agent`: Categorizes customers into meaningful segments based on data insights.
  - `content_agent`: Generates personalized marketing copy (Email, SMS, Ads) with a built-in refinement loop.
  - `reviewer_agent`: Validates all generated content against brand guidelines and legal compliance.
- **Production-Ready Tooling**:
  - **Native BigQuery MCP**: Fast, authenticated connection to BigQuery with hybrid local/remote identity handling.
  - **Structured Blackboard**: All agents communicate via Pydantic schemas stored in the session state.
  - **Self-Healing Logic**: Built-in `BigQueryReflectRetryPlugin` automatically handles and fixes SQL errors and transient connection issues.
- **Enterprise Developer Suite**: Integrated `adk web` playground, automated behavioral evals, and full Terraform-managed CI/CD pipelines.

## Developer Flow

This template follows a robust **Local -> Remote Dev -> Remote Staging -> Remote Prod** flow.

### 1. Local Development
Iterate on your agent and tools locally with high performance.
- **Setup**: `make setup` followed by `make gcp-setup`.
- **Playground**: `make playground` (interactive test of all agents).
- **Custom UI**: `make ui` (starts the chat interface at http://localhost:3000).
- **Checks**: `make lint`, `make test`, `make eval`.

### 2. Deployment to Cloud (Manual)
Test in managed cloud environments using dedicated service accounts.
- **Dev**: `make deploy-dev` (Deploys to a sandbox instance with full IAM permissions).
- **Staging/Prod**: Managed via CI/CD, but manual deployment is available via `make deploy-prod`.

### 3. CI/CD (GitHub Actions & Terraform)
The project includes full infrastructure-as-code management:
- **Terraform**: All IAM roles (including BigQuery and MCP) and service accounts are managed in `deployment/terraform/`.
- **Staging**: Merges to `main` trigger deployment to the **Staging** environment and automated Load Tests.
- **Production**: Promotion requires manual approval in GitHub Actions.

## Custom Chat UI
A modern, SSE-powered chat interface is provided in `frontend/`. 
- **Intelligent Rendering**: Handled duplicated chunks and full-state updates from ADK streams.
- **Multi-Environment**: Seamlessly switch between Local, Dev, Staging, and Prod backends from the UI header.

## Documentation
- **[AGENT_DESIGN.md](AGENT_DESIGN.md)**: Detailed technical breakdown of the Hub-and-Spoke architecture.
- **[BIGQUERY_MCP_AUTH.md](BIGQUERY_MCP_AUTH.md)**: Guide on identity management and user delegation.
- **[DESIGN_SPEC.md](DESIGN_SPEC.md)**: Original project goals and architectural constraints.

## Project Structure
- `agents/`:
  - `marketing_agent/`: The primary multi-agent system (Manager + 4 sub-agents).
  - `shared/`: Shared tools and specialized plugins (BigQuery recovery).
  - `agent_engine_app.py`: Entrypoint for remote Agent Engine deployment.
- `deployment/terraform/`: Managed infrastructure and IAM definitions.
- `frontend/`: FastAPI backend and vanilla JS/CSS chat frontend.
- `tests/`: Unit, integration, and behavioral evaluation sets.
- `Makefile`: Centralized command hub for the entire developer lifecycle.

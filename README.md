# CampaignFlow: Production ADK Marketing Dashboard

A comprehensive AI-driven marketing orchestration system built with the Google ADK (Agent Development Kit) and React. This template demonstrates a sophisticated **Hub-and-Spoke** multi-agent orchestration pattern with **Sequential Pipelines** for automating data-driven marketing workflows—from BigQuery analysis to personalized content creation and activation.

## Features
![CampaignFlow Architecture](./nanobanana-output/editremove_the_connection_line_d.png)

- **Hub-and-Spoke Orchestration**:
  - **Marketing Manager**: The central hub that manages state, monitors the "Blackboard," and coordinates expert pipelines.
  - **Recommendation Pipeline**: Opportunity Analyst → Campaign Recommender (Finds data patterns and suggests campaigns).
  - **Strategy Pipeline**: Campaign Architect → Segmentation Agent (Defines the brief and identifies target audiences).
  - **Content Pipeline**: Content Creator → Brand Reviewer (Generates personalized copy and validates against brand guidelines).
- **React-Based Dashboard**:
  - High-fidelity UI built with Vite, React, and Tailwind/CSS.
  - Features dedicated panels for Analysis, Strategy, Content, and Review.
  - Uses `BlackboardContext` for centralized state management across agent streams.
- **Production-Ready Tooling**:
  - **Native BigQuery MCP**: Fast, authenticated connection to BigQuery.
  - **Activation Workflow**: Approved campaigns are saved to a local SQLite database (`campaigns.db`) via a FastAPI proxy.
  - **Contract Validation**: Built-in scripts to ensure frontend TypeScript interfaces and backend Python Pydantic models remain in sync.

## Developer Flow

This template follows a robust **Local -> Remote Dev -> Remote Staging -> Remote Prod** flow.

### 1. Local Development
The most reliable way to start all components (ADK Backend, FastAPI Proxy, and React UI) is using the unified startup script:

```bash
# Start the full application
bash campaign-flow/scripts/start_all.sh
```
- Access the React UI at **http://localhost:5173**
- The ADK Agent Backend runs on Port 8000
- The FastAPI Proxy runs on Port 3000

**Other useful commands:**
- **Setup**: `make setup` followed by `make gcp-setup`.
- **Contract Validation**: `make validate-contract`.
- **Checks**: `make lint`, `make test`, `make eval`.
- **Basic UI**: `make ui` (starts only the backend and a simplified chat interface at http://localhost:3000).

### 2. Deployment to Cloud (Manual)
Test in managed cloud environments using dedicated service accounts.
- **Dev**: `make deploy-dev` (Deploys to a sandbox instance with full IAM permissions).
- **Staging/Prod**: Managed via CI/CD, but manual deployment is available via `make deploy-prod`.

### 3. CI/CD (GitHub Actions & Terraform)
The project includes full infrastructure-as-code management:
- **Terraform**: All IAM roles (including BigQuery and MCP) and service accounts are managed in `deployment/terraform/`.
- **Staging**: Merges to `main` trigger deployment to the **Staging** environment and automated Load Tests.
- **Production**: Promotion requires manual approval in GitHub Actions.

## Documentation
- **[CAMPAIGN-FLOW.md](CAMPAIGN-FLOW.md)**: Detailed architectural overview of the React dashboard and agent pipelines.
- **[AGENT_DESIGN.md](AGENT_DESIGN.md)**: Technical breakdown of the Hub-and-Spoke architecture.
- **[BIGQUERY_MCP_AUTH.md](BIGQUERY_MCP_AUTH.md)**: Guide on identity management and user delegation.
- **[DEVELOPMENT_FLOW.md](DEVELOPMENT_FLOW.md)**: Guide on using different environments.

## Project Structure
- `agents/`: The Python backend containing the primary multi-agent system, shared tools, and `agent_engine_app.py`.
- `campaign-flow/`: The React frontend application (Vite + TypeScript).
- `deployment/terraform/`: Managed infrastructure and IAM definitions.
- `frontend/`: FastAPI proxy backend that handles local SQLite activation and bridges the UI with the ADK backend.
- `scripts/`: Utilities like `validate_contract.py` and `migrate_db_contract.py`.
- `tests/`: Unit, integration, and behavioral evaluation sets (`.evalset.json`).
- `Makefile`: Centralized command hub for the developer lifecycle.

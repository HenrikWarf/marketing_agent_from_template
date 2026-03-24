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

## Getting Started

### 1. Prerequisites
- **Python 3.12+**
- **uv** (recommended for package management)
- **Node.js** (required for MCP filesystem server example)

### 2. Initial Setup
If you just cloned this repository, follow these steps to set up your environment:

```bash
# Install dependencies and create a virtual environment
make setup
```

### 3. Environment Configuration
The agents require Google Cloud credentials and configuration to function.

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your project details**:
   ```bash
   # Open .env and set your values:
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   ```

3. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth application-default login
   ```

### 4. Running the Playground
Start the interactive web-based playground to chat with your agents:

```bash
make playground
```
This will start a server, usually at `http://127.0.0.1:8000`. You will find all four agent types available for selection in the UI.

## Development & CI

### Automated Checks
Run the linter and tests to ensure your changes are correct:

```bash
# Run linting (ruff)
make lint

# Run unit tests (pytest)
make test
```

### Local Git Hook (CI)
To prevent pushing broken code, you can use the provided `ci.sh` script as a git hook:

```bash
# Link the CI script as a pre-push hook
chmod +x ci.sh
ln -s ../../ci.sh .git/hooks/pre-push
```

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

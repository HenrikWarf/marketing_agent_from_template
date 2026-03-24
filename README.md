# ADK Agent Base Template

A comprehensive starting point for building, testing, and deploying agents with the Google ADK.

## Project Structure
- `app/`: Agent logic and tooling definitions.
  - `tools.py`: Examples of Pure Functions, MCP placeholders, and Google Search.
  - `simple_agent.py`: Basic LLM agent.
  - `subagents.py`: Root agent with subagents coordination.
  - `sequential.py`: Sequential agent flow.
  - `loop.py`: Iterative loop agent.
- `tests/`: Automated tests with `pytest`.
- `Makefile`: Convenience commands for setup, linting, testing, and local execution.
- `ci.sh`: Local CI script for linting and testing.
- `DESIGN_SPEC.md`: Detailed architecture specification.

## Quick Start
1. **Setup**: Install `uv` and run:
   ```bash
   make setup
   ```
2. **Local Testing**: Run the interactive web playground:
   ```bash
   make playground
   ```
3. **Linting & Testing**:
   ```bash
   make lint
   ```
   ```bash
   make test
   ```

## Local Git Hook (CI)
To ensure all checks pass before merging to `main`, you can add `ci.sh` as a git hook:
```bash
ln -s ../../ci.sh .git/hooks/pre-push
chmod +x ci.sh
```

## Deployment
This template is designed to be easily deployable to Vertex AI Agent Engine. Use the `agent-starter-pack` for full deployment scaffolding:
```bash
uvx agent-starter-pack enhance . --deployment-target agent_engine
```

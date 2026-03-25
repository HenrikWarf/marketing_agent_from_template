# Gemini CLI Project Mandates - ADK Agent Template

This file contains foundational mandates and technical instructions for Gemini CLI when working on this project. These instructions take precedence over general workflows.

## Project Overview
A base template for building ADK agents with multiple architectural patterns (Simple, Subagent, Sequential, Loop) and tool integrations (Pure Functions, MCP, Google Search).

## Engineering Standards

### ADK Specifics
- **Agent Discovery**: Every agent must reside in its own subdirectory under `agents/` (e.g., `agents/my_agent/`).
- **Exposing Agents**: Each agent directory must have an `__init__.py` that exposes `root_agent` (e.g., `from . import agent; root_agent = agent.root_agent`).
- **Naming**: The main agent instance in `agent.py` must be named `root_agent` for `adk web` and `adk eval` compatibility.
- **Tools**: 
  - Use `google.adk.tools.FunctionTool` to wrap Python functions.
  - Use `google.adk.tools.google_search` for grounding.
  - MCP tools should be demonstrated via `McpToolset` (conceptual or real stdio connection).
- **Sub-agents**: Use the `sub_agents` parameter (not `agents`) when linking child agents to a root agent.

### Quality & Testing
- **Validation**: Every change must be verified by running `make lint`, `make test`, and `make eval`.
- **Evals**: Prioritize behavioral testing via `adk eval`. Follow the **Eval-Fix loop** described in `README.md`.
- **Mocking**: For external integrations like MCP, use conceptual placeholders or mocks in tests to ensure CI/CD reliability.

### Configuration
- **Auth**: Support both `GOOGLE_API_KEY` (AI Studio) and Vertex AI (ADC). Use `.env` for local configuration.
- **Environment**: Always use `uv` for running commands (e.g., `uv run ...`) or use the `Makefile` abstractions.

## File Structure Mandates
- **Agents**: `agents/<agent_name>/agent.py`
- **Shared Tools**: `agents/shared/tools.py`
- **Tests**: `tests/unit/` and `tests/integration/`
- **Behavioral Evals**: `tests/eval/evalsets/` and `tests/eval/eval_config.json`

## Deployment
- Deployment is targeted at **Vertex AI Agent Engine**.
- Use `uvx agent-starter-pack enhance . --deployment-target agent_engine` for scaffolding infrastructure.

## Proactiveness & Intent
- If a behavioral evaluation fails, analyze the failure reasons (hallucination, tool mismatch) and propose prompt refinements in the `agent.py` file.
- Maintain consistency across all four agent examples when updating shared tools or core instructions.

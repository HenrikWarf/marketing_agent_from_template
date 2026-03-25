# DESIGN_SPEC.md - ADK Agent Template

## Overview
This project serves as a comprehensive base template for building, testing, and deploying agents using the Google ADK (Agent Development Kit). It provides a structured environment with best practices for local development, behavioral evaluation, and seamless deployment to Vertex AI Agent Engine.

The template includes examples of various agent architectures (Simple, Subagent, Sequential, Loop) and diverse tooling integrations (Pure functions, MCP, Google Search).

## Example Use Cases
1. **Simple Assistant**: A direct LLM-based agent for general tasks.
2. **Coordinated Research**: A root agent delegating specialized tasks to subagents (e.g., searching vs. summarizing).
3. **Multi-step Workflow**: A sequential agent that processes data through a series of defined steps.
4. **Iterative Refinement**: A loop agent that continues to improve its output until a condition is met.

## Tools Required
- **Pure Functions**: Python functions wrapped as ADK tools for local logic.
- **MCP (Model Context Protocol)**: Integration with MCP servers for extensible tool capabilities (example uses conceptual placeholder).
- **Google Search Grounding**: Built-in tool for real-time information retrieval using Google Search.

## Constraints & Safety Rules
- Agents must strictly adhere to the provided instructions.
- All tools must include docstrings for LLM discovery.
- Secrets and API keys must be handled via environment variables (`.env`), never hardcoded.
- Agents must be organized into subdirectories under `agents/` for discovery.

## Success Criteria
- Successful local execution via `adk web agents/`.
- Passing linting (`ruff`) and unit tests (`pytest`).
- Successful behavioral evaluation via `adk eval` with scores above 0.8.
- Successful deployment to Agent Engine (scaffolding provided).
- Reproducible environment via `uv` or `venv`.

## Evaluation Strategy
- **Behavioral Testing**: Use `adk eval` to verify agent quality.
- **Metrics**: 
  - `tool_trajectory_avg_score`: Ensures tools are used in the correct sequence.
  - `final_response_match_v2`: Semantic verification of model responses.
  - `hallucinations_v1`: Grounds responses in tool outputs.
- **Eval-Fix Loop**: Iteratively refine prompts based on eval scores.

## Edge Cases to Handle
- Tool execution failures (graceful degradation).
- Large context handling (truncation or compaction strategies).
- Connectivity issues with external APIs (Google Search, MCP).
- Proactive LLM behavior bypassing required tool calls.

# Gemini CLI Project Mandates - CampaignFlow (ADK)

This file contains foundational mandates and technical instructions for Gemini CLI. These instructions take precedence over general workflows.

## Project Overview
A production-ready marketing orchestration platform built with **Google ADK** and **React**. It features a hub-and-spoke agent model with sequential pipelines, BigQuery integration, and an SQLite-backed campaign activation workflow.

## Engineering Standards

### ADK & Agent Orchestration
- **Architecture**: Enforce a **Hub-and-Spoke** model with **Sequential Pipelines** (`SequentialAgent`) for complex tasks (Recommendation, Strategy, Content).
- **Constraints**: Set `disallow_transfer_to_peers=True` and `disallow_transfer_to_parent=True` for all sub-agents to ensure results return to the hub correctly.
- **Strict Output**: Sub-agents MUST output **ONLY structured JSON** matching their schemas. Conversational text must be handled exclusively by the `Marketing Manager`.
- **Model**: Standardize on `gemini-2.0-flash` with the `GOOGLE_CLOUD_LOCATION` set to `global` in `agent.py`.

### React Frontend & State
- **State Management**: Use the `BlackboardContext` for all campaign-related structured data.
- **Monitoring**: Maintain the "Smart Monitor" in `App.tsx` to automatically switch views when new data arrives.
- **Streaming**: The `useChatStream` hook uses a specialized Multi-JSON parser. Never revert this to a simple string accumulator.
- **Unified Views**: Group related sections (e.g., Strategy + Audience) into a single dashboard view to minimize menu navigation.

### Data & Activation
- **Table Access**: Always use fully-qualified BigQuery paths (e.g., `` `project.dataset.table` ``) in agent instructions to prevent path hallucinations.
- **Activation**: Approved campaigns must be saved via the `POST /api/activate` endpoint to the `campaigns.db` SQLite database.
- **Persistence**: Never remove or bypass the `ActivationModal` confirmation flow.

## Testing & Validation Mandates
- **Contract Sync**: ALWAYS run `make validate-contract` before submitting UI or Agent schema changes.
- **Behavioral Evals**: Any change to orchestration logic MUST be verified with `make eval`.
- **Modular Tests**: Maintain the 5-stage separation in `core_workflow.evalset.json` to prevent evaluation hanging.

## File Structure Mandates
- **Primary Agents**: `agents/marketing_agent/agent.py`
- **Frontend Source**: `campaign-flow/src/`
- **Technical Documentation**: `CAMPAIGN-FLOW.md`
- **Auth Guide**: `BIGQUERY_MCP_AUTH.md`

## Proactiveness & Intent
- If a sub-agent's output is leaking into the chat, refine its `EXIT CONDITION` in `agent.py` to be more restrictive about JSON-only output.
- Always check the `adk_server.log` for Pydantic `ValidationErrors` when updating agent definitions.
- Ensure all new features align with the Material Design 3 aesthetic (pill shapes, specific elevations).

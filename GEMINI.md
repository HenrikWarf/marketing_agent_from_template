# Gemini CLI Project Mandates - CampaignFlow (ADK)

This file contains foundational mandates and technical instructions for Gemini CLI. These instructions take precedence over general workflows.

## Project Overview
A production-ready marketing orchestration platform built with **Google ADK** and **React**. It features a hub-and-spoke agent model with sequential pipelines, BigQuery integration, and an SQLite-backed campaign activation workflow.

## Engineering Standards

### ADK & Agent Orchestration
- **Architecture**: Enforce a **Hub-and-Spoke** model with **Sequential Pipelines** (`SequentialAgent`) for complex tasks.
- **Constraints**: Set `disallow_transfer_to_peers=True` and `disallow_transfer_to_parent=True` for all sub-agents to ensure results return to the hub correctly.
- **Strict Output**: Sub-agents MUST output **ONLY structured JSON** matching their schemas. Conversational text must be handled exclusively by the `Marketing Manager`.
- **Model**: Standardize on `gemini-3-flash-preview` (or `gemini-2.0-flash` if requested) with the `GOOGLE_CLOUD_LOCATION` set to `global` in `agent.py`.
- **Data Safety**: Large tool outputs (like BigQuery) MUST be truncated to **50 rows** in the `BigQueryReflectRetryPlugin` to prevent context explosion and frontend crashes.

### React Frontend & State
- **State Management**: Use the `BlackboardContext` for all campaign-related structured data.
- **Event Handling**: Support ADK 3.x structures by parsing `actions.stateDelta` (camelCase) and identifying tool calls in `content.parts`.
- **Streaming**: The `useChatStream` hook uses a two-stage Multi-JSON parser (Markdown blocks first, then brace matching). Never revert this to a simple string accumulator or use complex nested regex that can hang the browser.
- **Resilience**: Components like `AnalysisPanel` must handle partial or flat data structures gracefully.
- **Monitoring**: Maintain the "Smart Monitor" in `App.tsx` and the `onDataReceived` callback to automatically switch views when new data arrives.

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

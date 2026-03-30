# Agent Design: Hub-and-Spoke Orchestration

This document details the architectural design of the Marketing Agent system, built using the Google Agent Development Kit (ADK). The system follows a **Hub-and-Spoke** model with **Structured Handoffs** and a **Shared State (Blackboard)**.

## 1. Architectural Overview

Instead of a linear chain where agents call each other blindly ($A \to B \to C$), this system uses a centralized **Marketing Manager** that acts as the hub. Sub-agents (specialized contractors) perform specific tasks and always return control to the hub.

### The Hub-and-Spoke Model
-   **The Hub (Marketing Manager)**: Manages global goals, monitors the shared state, and decides which expert to call next.
-   **The Spokes (Sub-agents)**: Isolated experts (Analysis, Segmentation, Content, Review) that execute a specific command and return a structured result.

## 2. Key Design Patterns

### A. Strict Control Loops
To prevent agents from getting lost in linear chains, we enforce structural constraints:
-   `disallow_transfer_to_peers=True`: Sub-agents cannot talk to each other.
-   `disallow_transfer_to_parent=True`: Sub-agents terminate immediately after providing their output, forcing the ADK framework to return context to the root agent.

### B. The "Blackboard" (Shared State)
We use the session state as a "Blackboard" where agents write their findings. This allows the Manager to see the project's progress.
-   **Implementation**: Use the `output_key` parameter in the `Agent` definition.

```python
analysis_agent = Agent(
    name="analysis_agent",
    output_key="analysis_data", # Automatically writes result to session state
    # ...
)
```

### C. Structured Handoffs (Pydantic)
To ensure the "Manager" receives data it can actually use, every sub-agent is constrained by an `output_schema`.

```python
class AnalysisResult(BaseModel):
    summary: str
    key_metrics: Dict[str, Any]
    trends: List[str]

analysis_agent = Agent(
    name="analysis_agent",
    output_schema=AnalysisResult,
    # ...
)
```

## 3. Agent Roles & Workflow

| Agent | Role | Input (from Blackboard) | Output (to Blackboard) |
| :--- | :--- | :--- | :--- |
| **Marketing Manager** | Orchestrator | User Query + All Keys | Decision / Final Answer |
| **Analysis Agent** | Data Analyst | BigQuery Schema | `analysis_data` |
| **Segmentation Agent** | Strategist | `analysis_data` | `segments_data` |
| **Content Agent** | Copywriter | `segments_data` | `content_data` |
| **Reviewer Agent** | Compliance | `content_data` | `review_data` (VERIFIED/REJECTED) |

### The "Self-Correction" Loop
The Marketing Manager implements a logic loop for content review:
1.  **Manager** transfers to **Content Agent**.
2.  **Content Agent** returns `content_data` to Hub.
3.  **Manager** transfers to **Reviewer Agent**.
4.  **Reviewer Agent** returns `review_data`.
5.  If `review_data.status == "REJECTED"`, the **Manager** sends the feedback *back* to the **Content Agent**.

## 4. Implementation Example

Here is a snippet showing how the Manager is prompted to be state-aware:

```python
root_agent = Agent(
    name="marketing_manager",
    instruction="""
    ALWAYS check the session state (Blackboard) to see what work is done.
    
    WORKFLOW:
    - If 'analysis_data' is missing -> Transfer to analysis_agent.
    - If 'segments_data' is missing -> Transfer to segmentation_agent.
    - If 'review_data' status is 'REJECTED' -> Send feedback back to content_agent.
    """
)
```

## 5. Benefits of this Design
1.  **Predictability**: The flow is determined by the Manager, not by a random "next step" suggestion from a sub-agent.
2.  **Observability**: You can inspect the "Blackboard" at any time to see exactly what data was produced at each stage.
3.  **Scalability**: Adding a new expert (e.g., a "Social Media Agent") only requires adding a new spoke and updating the Manager's workflow rules.

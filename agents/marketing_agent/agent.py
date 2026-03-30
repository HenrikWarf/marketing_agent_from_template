import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google.adk import Agent
from agents.shared.plugins import BigQueryReflectRetryPlugin
from agents.shared.tools import bq_mcp_toolset, mcp_query_tool

# --- Structured Output Schemas (The Blackboard) ---

class AnalysisResult(BaseModel):
    """Result of the data analysis phase."""
    summary: str = Field(description="Executive summary of findings")
    key_metrics: Dict[str, Any] = Field(description="Important metrics discovered")
    trends: List[str] = Field(description="Identified trends in the data")
    raw_query_used: str = Field(description="The SQL query that produced these results")

class SegmentationResult(BaseModel):
    """Result of the customer segmentation phase."""
    segments: List[Dict[str, Any]] = Field(description="List of segments with name, description, and count")
    logic_reasoning: str = Field(description="Reasoning behind these segment definitions")

class ContentResult(BaseModel):
    """Result of the marketing content creation phase."""
    content_drafts: List[Dict[str, Any]] = Field(description="Drafts for different channels (email, SMS, etc.)")
    target_segment: str = Field(description="The specific segment this content is for")
    call_to_action: str = Field(description="The primary action we want users to take")

class ReviewResult(BaseModel):
    """Result of the brand and compliance review."""
    status: str = Field(description="Must be exactly 'VERIFIED' or 'REJECTED'")
    feedback: str = Field(description="Detailed feedback or suggestions for improvement")
    guideline_check: bool = Field(description="True if all guidelines are met")

# --- Configuration ---

# BigQuery table configuration for marketing data
BQ_CUSTOMER_TABLE = os.getenv("BQ_CUSTOMER_TABLE", "marketing-agent-01-491314.customer_data_furniture.customer")

# Load table schema context for better query generation
schema_path = os.path.join(os.path.dirname(__file__), "customer_schema.json")
try:
    with open(schema_path, "r") as f:
        CUSTOMER_SCHEMA = f.read()
except Exception as e:
    print(f"Warning: Could not load customer_schema.json: {e}")
    CUSTOMER_SCHEMA = "Schema details unavailable."

# Fallback tool if BigQuery toolset is not available
data_tools = [bq_mcp_toolset] if bq_mcp_toolset else [mcp_query_tool]

# Plugin for self-healing/retry on tool failures - specialized for BigQuery
retry_plugin = BigQueryReflectRetryPlugin(max_retries=3)

# 1. Analysis Agent - Fetches and analyzes BigQuery data
analysis_agent = Agent(
    name="analysis_agent",
    model="gemini-2.5-flash",
    instruction=f"""You are a data analyst. Your goal is to analyze customer data from the BigQuery table: {BQ_CUSTOMER_TABLE} using the provided tools.
    If you have access to BigQuery MCP tools (like execute_sql), use them to run actual SQL queries against the table.
    
    Here is the table schema for your reference:
    {CUSTOMER_SCHEMA}
    
    CRITICAL: If a tool call (like execute_sql) returns an error, analyze the error message, correct your query, and try again. 
    Common issues include wrong column names or table references. 
    If you see an error about 'TaskGroup' or 'unhandled errors', this is a transient connection issue. Wait a moment and retry your query exactly as it was.
    Use the error feedback to improve your next attempt.
    
    EXIT CONDITION: Once you have identified key metrics and trends, format your findings according to the AnalysisResult schema and terminate. 
    DO NOT suggest next steps or try to transfer to other agents.
    """,
    tools=data_tools,
    output_schema=AnalysisResult,
    output_key="analysis_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Analyzes BigQuery data to find trends and insights."
)

# 2. Segmentation Agent - Segments customers based on analysis
segmentation_agent = Agent(
    name="segmentation_agent",
    model="gemini-2.5-flash",
    instruction=f"""You are a segmentation expert. Based on the data analysis provided, 
    group customers into meaningful marketing segments (e.g., high-value, churn-risk, price-sensitive).
    Provide clear definitions and unique characteristics for each segment.
    If you have access to BigQuery MCP tools (like execute_sql), use them to fetch additional data from the table {BQ_CUSTOMER_TABLE} if needed for more precise segmentation.
    
    Here is the table schema for your reference:
    {CUSTOMER_SCHEMA}
    
    CRITICAL: If a tool call returns an error, analyze the feedback, fix your request, and retry.
    
    EXIT CONDITION: Once segments are defined, format your output according to the SegmentationResult schema and terminate.
    DO NOT suggest next steps or try to transfer to other agents.
    """,
    tools=data_tools,
    output_schema=SegmentationResult,
    output_key="segments_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Segments customers into marketing categories based on data."
)


# 3. Personalized Content Agent - Creates text-based marketing content
content_agent = Agent(
    name="content_agent",
    model="gemini-2.5-flash",
    instruction="""You are a marketing copywriter. Create personalized text content (emails, SMS, or social ads)
    tailored specifically to the customer segments and insights provided in the session state.
    The tone should be engaging and focused on marketing communication.
    
    EXIT CONDITION: Once the content drafts are complete, format your output according to the ContentResult schema and terminate.
    DO NOT suggest next steps or try to transfer to other agents.
    """,
    output_schema=ContentResult,
    output_key="content_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Creates personalized marketing text for specific segments."
)

# 4. Reviewer Agent - Validates content against guidelines
reviewer_agent = Agent(
    name="reviewer_agent",
    model="gemini-2.5-flash",
    instruction="""You are a brand reviewer. Your job is to ensure all marketing content follows 
    the company's guidelines. Check for brand consistency, tone, and legal compliance.
    Reject and suggest fixes for any content that doesn't meet the standards.
    
    EXIT CONDITION: Once you have completed the review, format your output according to the ReviewResult schema and terminate.
    - If correct, status must be 'VERIFIED'.
    - If there are issues, status must be 'REJECTED' and feedback must be detailed.
    DO NOT suggest next steps or try to transfer to other agents.
    """,
    output_schema=ReviewResult,
    output_key="review_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Reviews marketing content against company brand guidelines."
)

# 5. Marketing Manager - The entry point for the user
root_agent = Agent(
    name="marketing_manager",
    model="gemini-2.5-flash",
    instruction="""You are the Marketing Manager. Your primary role is to coordinate your specialized team 
    to deliver high-quality marketing outcomes. You manage the global state and decide which expert to call next.
    
    MANAGEMENT RULES:
    1. DO NOT perform specialized tasks (analysis, segmentation, drafting, review) yourself.
    2. ALWAYS check the session state (Blackboard) to see what work has already been completed.
    3. Hub-and-Spoke: Sub-agents will return their results to you. Analyze their output before deciding the next step.
    
    WORKFLOW:
    - If data needs to be explored or trends identified -> Transfer to analysis_agent.
    - If analysis is done (`analysis_data` is present) but segments are missing -> Transfer to segmentation_agent.
    - If segments are defined (`segments_data` is present) but content is missing -> Transfer to content_agent.
    - If content is drafted (`content_data` is present) -> Transfer to reviewer_agent.
    - If reviewer rejects content (`review_data.status` is 'REJECTED') -> Send feedback back to content_agent.
    - If reviewer verifies content (`review_data.status` is 'VERIFIED') -> Present the final verified content to the user and conclude the task.
    
    You are the only agent that speaks directly to the end-user.
    """,
    sub_agents=[analysis_agent, segmentation_agent, content_agent, reviewer_agent]
)

if __name__ == "__main__":
    root_agent.run()

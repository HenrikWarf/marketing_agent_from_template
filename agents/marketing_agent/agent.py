import os
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google.adk import Agent
from google.adk.agents import SequentialAgent
from agents.shared.plugins import BigQueryReflectRetryPlugin
from agents.shared.tools import bq_mcp_toolset
from agents.marketing_agent.company_context import COMPANY_CONTEXT

# --- Load Static Context ---

# BigQuery table configuration for marketing data
BQ_CUSTOMER_TABLE = os.getenv("BQ_CUSTOMER_TABLE", "marketing-agent-01-491314.customer_data_furniture.customer")
PROJECT_ID = os.getenv("PROJECT_ID", "marketing-agent-01-491314")
DATASET_ID = os.getenv("DATASET_ID", "customer_data_furniture")
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-2.5-flash")

# Load marketing schema context for data-driven decisions
schema_path = os.path.join(os.path.dirname(__file__), "marketing_schema.json")
try:
    with open(schema_path, "r") as f:
        MARKETING_SCHEMA = f.read()
except Exception as e:
    print(f"Warning: Could not load marketing_schema.json: {e}")
    MARKETING_SCHEMA = "Schema details unavailable."

# Load brand guidelines for content agents
brand_path = os.path.join(os.path.dirname(__file__), "brand_guidelines.md")
try:
    with open(brand_path, "r") as f:
        BRAND_GUIDELINES = f.read()
except Exception as e:
    print(f"Warning: Could not load brand_guidelines.md: {e}")
    BRAND_GUIDELINES = "Follow a professional and enthusiastic marketing tone."

# --- Structured Output Schemas (The Blackboard) ---

class BriefResult(BaseModel):
    """Result of the campaign strategy/briefing phase."""
    campaign_name: str = Field(description="Internal name for the campaign")
    business_opportunity: str = Field(description="The data-driven insight that inspired this campaign")
    primary_goal: str = Field(description="The main business objective (e.g. Reduce churn)")
    target_audience_description: str = Field(description="High-level description of who we are targeting")
    recommended_channels: List[str] = Field(description="List of channels (Email, SMS, Social)")
    success_kpi: str = Field(description="The metric used to measure success")
    recommended_products: List[str] = Field(description="List of product names to feature")

class AnalysisResult(BaseModel):
    """Result of the data analysis phase."""
    summary: str = Field(description="Executive summary of findings")
    key_metrics: Dict[str, Any] = Field(description="Important single-value metrics (e.g. total_customers: 1000)")
    visualizations: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Data specifically for charts and tables. Each item should have 'title', 'type' (bar, line, or table), and 'data' (list of objects)."
    )
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


# --- Agent Definitions ---

# The tools used by data agents (Analysis and Segmentation)
data_tools = []
if bq_mcp_toolset:
    data_tools.append(bq_mcp_toolset)


# Plugin for self-healing/retry on tool failures - specialized for BigQuery
retry_plugin = BigQueryReflectRetryPlugin(max_retries=3)

# 1. Analysis Agent - Fetches and analyzes BigQuery data (sales, inventory, customers)
analysis_agent = Agent(
    name="analysis_agent",
    model=MODEL_NAME,
    instruction=f"""You are a data analyst at Crazy Furnishing Company. Your goal is to analyze customer, sales, and product data from BigQuery using the provided tools.
    
    IMPORTANT - DATA ACCESS:
    - Customer Table: `{PROJECT_ID}.{DATASET_ID}.customer`
    - Sales Table: `{PROJECT_ID}.{DATASET_ID}.sales`
    - Products Table: `{PROJECT_ID}.{DATASET_ID}.products`
    - Campaign History: `{PROJECT_ID}.{DATASET_ID}.campaign_history`
    
    GUIDELINES:
    1. Focus on high-value patterns: CLV, churn risk, inventory levels, and historical campaign ROI.
    2. Use the 'visualizations' field to store raw data for patterns. IMPORTANT: Keep datasets small (e.g., Top 10-15 rows max) to ensure fast processing.
    3. Look for "Low Inventory" alerts in the products table to recommend "Back in Stock" or "Last Chance" campaigns.
    4. Analyze 'campaign_history' to see which media types are working best.
    
    Here is the full marketing schema for your reference:
    {MARKETING_SCHEMA}
    
    CRITICAL: If a tool call returns an error, analyze the feedback, fix your request, and retry.
    
    EXIT CONDITION: Once you have gathered sufficient insights, format your final output strictly according to the AnalysisResult schema and terminate. DO NOT suggest next steps or try to transfer to other agents.
    """,
    tools=data_tools,
    output_schema=AnalysisResult,
    output_key="analysis_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Analyzes BigQuery data (sales, products, customers) to find trends and insights."
)

# 2. Campaign Architect - Defines the strategy and brief
campaign_architect = Agent(
    name="campaign_architect",
    model=MODEL_NAME,
    instruction=f"""You are a Strategic Campaign Architect at Crazy Furnishing Company.
    Your goal is to define the high-level strategy and "Brief" for a marketing campaign.
    
    STRATEGY RULES:
    1. BLACKBOARD FIRST: Always check 'analysis_data' in the session state. If it contains sufficient insights, use them.
    2. MINIMAL TOOLS: Do not perform broad analysis. If you need a specific data point (e.g. current stock of one item), perform ONE targeted query.
    3. If complex analysis is missing, transfer to 'analysis_agent'.
    4. BRAND ALIGNED: Ensure the brief reflects our quirky, enthusiastic brand identity.
    5. RECOMMENDED OUTPUT: Suggest the best channel mix and specific product names (like SÏTZY, SLËËPY) to feature.
    
    Here is the marketing schema context:
    {MARKETING_SCHEMA}
    
    EXIT CONDITION: Once the strategy is defined, format your final output strictly according to the BriefResult schema and terminate.
    CRITICAL: Do NOT include any conversational text or preamble. Output ONLY the structured JSON.
    """,
    tools=data_tools,
    output_schema=BriefResult,
    output_key="brief_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Defines the campaign strategy, goals, and business opportunities."
)

# 3. Segmentation Agent - Segments customers based on analysis and strategy
segmentation_agent = Agent(
    name="segmentation_agent",
    model=MODEL_NAME,
    instruction=f"""You are a segmentation expert at Crazy Furnishing Company. Your goal is to categorize 
    customers into meaningful segments based on the insights provided in the session state (analysis_data) and the campaign brief (brief_data).
    
    Provide clear definitions and unique characteristics for each segment.
    
    Here is the marketing schema for your reference:
    {MARKETING_SCHEMA}
    
    CRITICAL: If a tool call returns an error, analyze the feedback, fix your request, and retry.
    
    EXIT CONDITION: Once segments are defined, format your final output strictly according to the SegmentationResult schema and terminate.
    CRITICAL: Do NOT include any conversational text or preamble. Output ONLY the structured JSON.
    """,
    tools=data_tools,
    output_schema=SegmentationResult,
    output_key="segments_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Segments customers into marketing categories based on data and strategy."
)


# 4. Personalized Content Agent - Creates text-based marketing content
content_agent = Agent(
    name="content_agent",
    model=MODEL_NAME,
    instruction=f"""
    {BRAND_GUIDELINES}
    
    You are a marketing copywriter at Crazy Furnishing Company. Create personalized text content (emails, SMS, or social ads)
    tailored specifically to the customer segments and insights provided in the session state.
    The tone should be engaging, enthusiastic, and quirky as per our guidelines.
    
    EXIT CONDITION: Once the content drafts are complete, format your output according to the ContentResult schema and terminate.
    CRITICAL: Do NOT include any conversational text or preamble. Output ONLY the structured JSON.
    """,
    output_schema=ContentResult,
    output_key="content_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Generates personalized marketing copy for targeted segments."
)


# 5. Reviewer Agent - Validates content against guidelines
reviewer_agent = Agent(
    name="reviewer_agent",
    model=MODEL_NAME,
    instruction=f"""
    {BRAND_GUIDELINES}
    
    You are a brand reviewer at Crazy Furnishing Company. Your job is to ensure all marketing content follows 
    the company's guidelines. Check for brand consistency, tone, and legal compliance.
    Reject and suggest fixes for any content that doesn't meet the standards.
    
    EXIT CONDITION: Once you have completed the review, format your output according to the ReviewResult schema and terminate.
    CRITICAL: Do NOT include any conversational text or preamble. Output ONLY the structured JSON.
    """,
    output_schema=ReviewResult,
    output_key="review_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Reviews marketing content against company brand guidelines."
)

# 6. Content Pipeline - Sequential flow for Drafting -> Reviewing
content_pipeline = SequentialAgent(
    name="content_pipeline",
    sub_agents=[content_agent, reviewer_agent],
    description="Automated sequential pipeline that generates marketing content and then performs a brand review."
)

# 7. Marketing Manager - The entry point for the user
root_agent = Agent(
    name="marketing_manager",
    model=MODEL_NAME,
    instruction=f"""
    {COMPANY_CONTEXT}
    
    You are the Marketing Manager at Crazy Furnishing Company. Your primary role is to coordinate your specialized team 
    to deliver high-quality marketing outcomes. You manage the global state and decide which expert to call next.
    
    MANAGEMENT RULES:
    1. CONVERSATIONAL: For simple greetings (Hello, Hi) or non-marketing chat, respond yourself using our quirky brand voice. 
    2. HUB-AND-SPOKE: Sub-agents return ONLY structured JSON. You are the only one who talks to the human.
    3. PROACTIVE: When a sub-agent completes a task, ALWAYS acknowledge it to the user in a friendly way and suggest the next logical step.
    
    WORKFLOW:
    - User Request -> Analysis (if needed) -> Campaign Brief (Architect) -> Segmentation -> Content Pipeline (Draft + Review).
    - If `analysis_data` is present but no `brief_data` -> Transfer to 'campaign_architect' to turn insights into strategy.
    - If `brief_data` is present but no `segments_data` -> Transfer to 'segmentation_agent'.
    - If `segments_data` is present but `content_data` is missing -> Transfer to 'content_pipeline'.
    - If `review_data.status` is 'REJECTED' -> Transfer back to 'content_pipeline' to fix and re-review.
    - If `review_data.status` is 'VERIFIED' -> Present the final verified content to the user and conclude.
    
    You are the only agent that speaks directly to the end-user.
    """,
    sub_agents=[analysis_agent, segmentation_agent, content_pipeline, campaign_architect],
    disallow_transfer_to_peers=False,
    disallow_transfer_to_parent=False,
    description="The main orchestrator for marketing campaigns at Crazy Furnishing Company."
)

if __name__ == "__main__":
    root_agent.run()

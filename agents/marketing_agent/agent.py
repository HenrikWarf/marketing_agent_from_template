import os
os.environ["GOOGLE_CLOUD_LOCATION"] = "global"
from typing import List, Dict, Any, Optional
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
MODEL_NAME = os.getenv("MODEL_NAME", "gemini-3-flash-preview")

# Load marketing schema context
schema_path = os.path.join(os.path.dirname(__file__), "marketing_schema.json")
try:
    with open(schema_path, "r") as f:
        MARKETING_SCHEMA = f.read()
except Exception as e:
    print(f"Warning: Could not load marketing_schema.json: {e}")
    MARKETING_SCHEMA = "Schema details unavailable."

# Load brand guidelines
brand_path = os.path.join(os.path.dirname(__file__), "brand_guidelines.md")
try:
    with open(brand_path, "r") as f:
        BRAND_GUIDELINES = f.read()
except Exception as e:
    print(f"Warning: Could not load brand_guidelines.md: {e}")
    BRAND_GUIDELINES = "Follow a professional and enthusiastic marketing tone."

# --- Structured Output Schemas (The Blackboard) ---

class CampaignIdea(BaseModel):
    """A single data-driven campaign recommendation."""
    title: str = Field(description="Catchy name for the recommended campaign")
    reasoning: str = Field(description="The data-driven 'Why' behind this recommendation")
    suggested_audience: str = Field(description="Who should we target?")
    potential_impact: str = Field(description="Expected business outcome")

class RecommendationResult(BaseModel):
    """Result of the campaign recommendation phase."""
    recommendations: List[CampaignIdea] = Field(
        description="Exactly three unique campaign recommendations based on data insights",
        min_length=3,
        max_length=3
    )

class BriefResult(BaseModel):
    """Result of the campaign strategy/briefing phase."""
    campaign_name: str = Field(description="Internal name for the campaign")
    business_opportunity: str = Field(description="The data-driven insight that inspired this campaign")
    primary_goal: str = Field(description="The main business objective")
    target_audience_description: str = Field(description="High-level description of who we are targeting")
    recommended_channels: List[str] = Field(description="List of channels")
    success_kpi: str = Field(description="The metric used to measure success")
    recommended_products: List[str] = Field(description="List of product names to feature")

class VisualizationItem(BaseModel):
    """A single chart or table data block."""
    title: str = Field(description="Clear title of the chart or table (e.g., 'Revenue by Category')")
    type: str = Field(description="Visual format: MUST be exactly 'bar', 'line', or 'table'")
    data: List[Dict[str, Any]] = Field(description="The ACTUAL data rows from the tool result. DO NOT leave these as empty objects. Each object must contain the column names as keys and the row values.")

class AnalysisResult(BaseModel):
    """Result of the data analysis phase."""
    summary: str = Field(description="A 2-3 sentence executive summary of the findings.")
    key_metrics: Dict[str, Any] = Field(description="A dictionary of key single-value metrics (e.g., {'Total Revenue': 5000, 'Customer Count': 120}). Keys should be user-friendly labels.")
    visualizations: List[VisualizationItem] = Field(
        default_factory=list,
        description="Data specifically for charts and tables. Extract this directly from your tool results."
    )
    trends: Optional[List[str]] = Field(default_factory=list, description="List of 2-3 identified trends or patterns in the data.")
    raw_query_used: Optional[str] = Field(default="", description="The EXACT primary SQL query you executed to get this data.")

class SegmentationResult(BaseModel):
    """Result of the customer segmentation phase."""
    segments: List[Dict[str, Any]] = Field(description="List of segments with name, description, count, and the actual sql query used")
    logic_reasoning: str = Field(description="Reasoning behind these segment definitions")

class ContentDraft(BaseModel):
    """A single marketing draft for a specific channel."""
    channel: str = Field(description="The platform (e.g. Email, Instagram, TikTok)")
    subject: str = Field(default="", description="The subject line or hook")
    text_content: str = Field(description="The main text, body, or post content of the message")

class ContentResult(BaseModel):
    """Result of the marketing content creation phase."""
    content_drafts: List[ContentDraft] = Field(description="List of standardized drafts")
    target_segment: str = Field(description="The specific segment this content is for")
    call_to_action: str = Field(description="The primary action we want users to take")

class ReviewResult(BaseModel):
    """Result of the brand and compliance review."""
    status: str = Field(description="Must be exactly 'VERIFIED' or 'REJECTED'")
    feedback: str = Field(description="Detailed feedback")
    guideline_check: bool = Field(description="True if all guidelines are met")


# --- Agent Definitions ---

data_tools = []
if bq_mcp_toolset:
    data_tools.append(bq_mcp_toolset)

retry_plugin = BigQueryReflectRetryPlugin(max_retries=3)

async def after_tool_wrapper(tool, args, tool_context, tool_response):
    """Wrapper to map ADK callback arguments to retry_plugin names."""
    result = await retry_plugin.after_tool_callback(
        tool=tool,
        tool_args=args,
        tool_context=tool_context,
        result=tool_response
    )
    # CRITICAL: Always return the original response if the plugin doesn't modify it.
    return result if result is not None else tool_response

async def on_tool_error_wrapper(tool, args, tool_context, error):
    """Wrapper to map ADK callback arguments to retry_plugin names."""
    result = await retry_plugin.on_tool_error_callback(
        tool=tool,
        tool_args=args,
        tool_context=tool_context,
        error=error
    )
    return result

# 1. Analysis Agent - General Purpose Explorer
analysis_agent = Agent(
    name="analysis_agent",
    model=MODEL_NAME,
    instruction=f"""You are a senior data analyst at Crazy Furnishing Company. Your goal is to answer marketing and data questions by querying BigQuery and providing structured insights.
    
    IMPORTANT - DATA ACCESS:
    - Customers: `{PROJECT_ID}.{DATASET_ID}.customer`
    - Products: `{PROJECT_ID}.{DATASET_ID}.products`
    - Sales: `{PROJECT_ID}.{DATASET_ID}.sales`
    - Campaign History: `{PROJECT_ID}.{DATASET_ID}.campaign_history`
    
    GUIDELINES:
    1. TARGETED ANALYSIS: Focus specifically on answering the user's current question.
    2. DATA EFFICIENCY: Use 'LIMIT 20' in your SQL queries.
    3. MINIMAL TOOL USE: Run only the queries necessary to answer the question.
    4. DATA EXTRACTION: When you receive tool results (usually a list of flat dictionaries), you MUST map these rows directly into the 'data' list of a 'VisualizationItem'. 
       EXAMPLE: If the tool returns [{{ "cat": "Living Room", "rev": 100 }}], your visualizations entry must be:
       {{ "title": "Revenue by Category", "type": "bar", "data": [{{ "cat": "Living Room", "rev": 100 }}] }}
       NEVER return empty objects if the tool returned data.

    WORKFLOW:
    - EXPLORE: Run targeted SQL queries using `execute_sql_readonly`.
    - ANALYZE: Review the tool results.
    - MAP: Populate the AnalysisResult schema. Ensure 'key_metrics' contains at least one relevant metric and 'visualizations' contains the raw row data from your queries.
    - TERMINATE: Output JSON and stop.

    Schema: {MARKETING_SCHEMA}

    EXIT CONDITION: Format strictly according to AnalysisResult schema and terminate.
    CRITICAL: JSON ONLY. NO CONVERSATIONAL TEXT. ALL DATA FIELDS MUST BE POPULATED WITH REAL VALUES FROM TOOLS. DO NOT OUTPUT EMPTY DATA OBJECTS.
    """,
    tools=data_tools,
    output_schema=AnalysisResult,
    output_key="analysis_data",
    after_tool_callback=after_tool_wrapper,
    on_tool_error_callback=on_tool_error_wrapper,
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Analyzes BigQuery data to answer specific user questions and find insights."
)

# 2. Recommendation Agents
opportunity_analyst = Agent(
    name="opportunity_analyst",
    model=MODEL_NAME,
    instruction=f"""You are a data-driven Opportunity Scout at Crazy Furnishing Company. 
    Explore BigQuery to find high-value business opportunities for new campaigns.
    
    TABLE ACCESS:
    - Customers: `{PROJECT_ID}.{DATASET_ID}.customer`
    - Products: `{PROJECT_ID}.{DATASET_ID}.products`
    - Sales: `{PROJECT_ID}.{DATASET_ID}.sales`
    - Campaign History: `{PROJECT_ID}.{DATASET_ID}.campaign_history`
    
    RULES:
    - Find EXACTLY THREE actionable opportunities across Sales, Inventory, Trends, or Customer segments.
    - Summarize evidence-based findings into 'opportunity_findings' in state.
    
    Marketing Schema: {MARKETING_SCHEMA}""",
    tools=data_tools,
    output_key="opportunity_findings",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Identifies business opportunities from raw data patterns."
)

campaign_recommender = Agent(
    name="campaign_recommender",
    model=MODEL_NAME,
    instruction=f"""{BRAND_GUIDELINES}
    Based on the opportunity_findings, recommend EXACTLY THREE unique marketing campaigns.
    Format your final output strictly according to the RecommendationResult schema and terminate.
    CRITICAL: JSON ONLY.""",
    output_schema=RecommendationResult,
    output_key="recommendations_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Suggests three creative campaign ideas based on identified opportunities."
)

recommendation_pipeline = SequentialAgent(
    name="recommendation_pipeline",
    sub_agents=[opportunity_analyst, campaign_recommender],
    description="Analyzes data for opportunities and recommends three campaigns."
)

# 3. Strategy Agents
campaign_architect = Agent(
    name="campaign_architect",
    model=MODEL_NAME,
    instruction=f"""You are a Strategic Campaign Architect at Crazy Furnishing Company. Define the "Brief".
    
    STRATEGY RULES:
    1. DATA-DRIVEN: Use 'analysis_data' or 'opportunity_findings' if available. 
    2. INDEPENDENT EXPLORATION: If prior insights are missing, you MUST explore the BigQuery data across these AREAS to justify your strategy:
       - SALES: Analyze recent transaction patterns using `{PROJECT_ID}.{DATASET_ID}.sales`.
       - INVENTORY: Check stock levels and availability in `{PROJECT_ID}.{DATASET_ID}.products`.
       - CUSTOMER: Identify segments, churn risks, or affinities using `{PROJECT_ID}.{DATASET_ID}.customer`.
       - TRENDS: Review past performance in `{PROJECT_ID}.{DATASET_ID}.campaign_history`.
    3. BRAND ALIGNED: Ensure the brief reflects our quirky identity.
    4. RECOMMENDED OUTPUT: Suggest channel mix and product names (like SÏTZY, SLËËPY).
    
    Schema: {MARKETING_SCHEMA}
    
    EXIT CONDITION: Format strictly according to BriefResult schema and terminate.
    CRITICAL: JSON ONLY.""",
    tools=data_tools,
    output_schema=BriefResult,
    output_key="brief_data",
    after_tool_callback=after_tool_wrapper,
    on_tool_error_callback=on_tool_error_wrapper,
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Defines the campaign strategy, goals, and business opportunities."
)

segmentation_agent = Agent(
    name="segmentation_agent",
    model=MODEL_NAME,
    instruction=f"""You are a segmentation expert at Crazy Furnishing Company. 
    Your goal is to categorize customers into meaningful segments based on the campaign brief (`brief_data`).
    
    REQUIRED WORKFLOW:
    1. READ THE BRIEF: Identify the target audience (e.g., high churn risk, high CLV).
    2. QUERY DATA: You MUST run at least one SQL query on `{PROJECT_ID}.{DATASET_ID}.customer` to find the distribution of these users.
    3. POPULATE SEGMENTS: For each group you find (e.g., by 'favorite_category'), create a segment object with a 'name', 'description', the ACTUAL 'count' from your query, and the actual 'sql' you used.
    4. SCHEMA: Your final output must strictly follow the SegmentationResult schema.
    
    Marketing Schema: {MARKETING_SCHEMA}
    
    EXIT CONDITION: Format your final output strictly according to the SegmentationResult schema and terminate. 
    CRITICAL: The 'segments' list must NOT be empty. It must contain the real data you found.
    CRITICAL: JSON ONLY.
    """,
    tools=data_tools,
    output_schema=SegmentationResult,
    output_key="segments_data",
    after_tool_callback=after_tool_wrapper,
    on_tool_error_callback=on_tool_error_wrapper,
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Segments customers into marketing categories based on data and strategy."
)

strategy_pipeline = SequentialAgent(
    name="strategy_pipeline",
    sub_agents=[campaign_architect, segmentation_agent],
    description="Unified pipeline that defines a campaign strategy and then segments the audience."
)

# 4. Creative Agents
content_agent = Agent(
    name="content_agent",
    model=MODEL_NAME,
    instruction=f"""{BRAND_GUIDELINES}
    Create personalized text content based on segments_data.
    Tone: Engaging, enthusiastic, and quirky.
    
    STRICT DATA RULES:
    - You MUST output a list of drafts in 'content_drafts'.
    - Each draft MUST use the key 'text_content' for the actual message text (do NOT use 'body', 'post_text', or 'video_concept').
    
    EXIT CONDITION: Format strictly according to ContentResult schema and terminate.
    CRITICAL: JSON ONLY.""",
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
    instruction=f"""{BRAND_GUIDELINES}
    Review content_data for brand consistency and compliance.
    
    EXIT CONDITION: Format strictly according to ReviewResult schema and terminate.
    CRITICAL: JSON ONLY.""",
    output_schema=ReviewResult,
    output_key="review_data",
    disallow_transfer_to_peers=True,
    disallow_transfer_to_parent=True,
    description="Reviews marketing content against company brand guidelines."
)

content_pipeline = SequentialAgent(
    name="content_pipeline",
    sub_agents=[content_agent, reviewer_agent],
    description="Sequential pipeline for drafting and reviewing content."
)

# 6. Marketing Manager
root_agent = Agent(
    name="marketing_manager",
    model=MODEL_NAME,
    instruction=f"""
    {COMPANY_CONTEXT}
    
    You are the Marketing Manager at Crazy Furnishing Company.
    
    MANAGEMENT RULES:
    1. CONVERSATIONAL: Handle simple greetings himself using quirky brand voice.
    2. HUB-AND-SPOKE: Sub-agents return ONLY structured JSON. 
    3. PROACTIVE: Acknowledge task completion and suggest logical next steps.
    
    WORKFLOW:
    - User wants ideas/recommendations -> recommendation_pipeline.
    - User wants to start a campaign -> strategy_pipeline.
    - If segments_data is present but content missing -> content_pipeline.
    - If analysis needed first -> analysis_agent.
    
    You are the only agent that speaks directly to the end-user.
    """,
    sub_agents=[analysis_agent, recommendation_pipeline, strategy_pipeline, content_pipeline],
    after_tool_callback=after_tool_wrapper,
    on_tool_error_callback=on_tool_error_wrapper,
    disallow_transfer_to_peers=False,
    disallow_transfer_to_parent=False,
    description="The main orchestrator for marketing campaigns."
)

if __name__ == "__main__":
    root_agent.run()

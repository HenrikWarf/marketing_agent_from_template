import os
from google.adk import Agent
from agents.shared.plugins import BigQueryReflectRetryPlugin
from agents.shared.tools import bq_mcp_toolset, mcp_query_tool

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
    Common issues include wrong column names or table references. Use the error feedback to improve your next attempt.
    Fetch relevant metrics, identify trends, and provide detailed data-driven insights.
    """,
    tools=data_tools,
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
    """,
    tools=data_tools,
    description="Segments customers into marketing categories based on data."
)


# 3. Personalized Content Agent - Creates text-based marketing content
content_agent = Agent(
    name="content_agent",
    model="gemini-2.5-flash",
    instruction="""You are a marketing copywriter. Create personalized text content (emails, SMS, or social ads)
    tailored specifically to the customer segments and insights provided by the other agents.
    The tone should be engaging and focused on marketing communication.
    """,
    description="Creates personalized marketing text for specific segments."
)

# 4. Reviewer Agent - Validates content against guidelines
reviewer_agent = Agent(
    name="reviewer_agent",
    model="gemini-2.5-flash",
    instruction="""You are a brand reviewer. Your job is to ensure all marketing content follows 
    the company's guidelines. Check for brand consistency, tone, and legal compliance.
    If the content is correct, start your response with 'VERIFIED:'.
    Reject and suggest fixes for any content that doesn't meet the standards.
    """,
    description="Reviews marketing content against company brand guidelines."
)

# 5. Orchestrator Agent - The entry point for the user
root_agent = Agent(
    name="marketing_orchestrator",
    model="gemini-2.5-flash",
    instruction="""You are the marketing system orchestrator. 
    Your primary role is to delegate tasks to your specialized team. 
    DO NOT perform specialized tasks yourself.
    
    - For any data queries or trend analysis, ALWAYS transfer to analysis_agent.
    - For defining customer segments or groups, ALWAYS transfer to segmentation_agent.
    - For drafting emails, SMS, or any marketing copy, ALWAYS transfer to content_agent.
    - For reviewing or verifying content against guidelines, ALWAYS transfer to reviewer_agent.
    
    You may answer general questions about the system, but specialized marketing work must be delegated.
    """,
    sub_agents=[analysis_agent, segmentation_agent, content_agent, reviewer_agent]
)

if __name__ == "__main__":
    root_agent.run()

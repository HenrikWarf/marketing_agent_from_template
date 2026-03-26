from google.adk import Agent
from agents.shared.tools import mcp_query_tool

# 1. Analysis Agent - Fetches and analyzes BigQuery data
analysis_agent = Agent(
    name="analysis_agent",
    model="gemini-2.5-flash",
    instruction="""You are a data analyst. Your goal is to analyze customer data from BigQuery via the mcp_query_tool.
    Fetch relevant metrics, identify trends, and provide detailed data-driven insights.
    """,
    tools=[mcp_query_tool],
    description="Analyzes BigQuery data to find trends and insights."
)

# 2. Segmentation Agent - Segments customers based on analysis
segmentation_agent = Agent(
    name="segmentation_agent",
    model="gemini-2.5-flash",
    instruction="""You are a segmentation expert. Based on the data analysis provided, 
    group customers into meaningful marketing segments (e.g., high-value, churn-risk, price-sensitive).
    Provide clear definitions and unique characteristics for each segment.
    You can also use the mcp_query_tool to fetch additional data from BigQuery if needed for more precise segmentation.
    """,
    tools=[mcp_query_tool],
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
    Reject and suggest fixes for any content that doesn't meet the standards.
    """,
    description="Reviews marketing content against company brand guidelines."
)

# 5. Orchestrator Agent - The entry point for the user
root_agent = Agent(
    name="marketing_orchestrator",
    model="gemini-2.5-flash",
    instruction="""You are the marketing system orchestrator. 
    1. Answer quick questions about our data and marketing solutions.
    2. Coordinate the specialized agents to deliver a full marketing package:
       - Use analysis_agent to get data insights.
       - Use segmentation_agent to define target groups.
       - Use content_agent to create the messaging.
       - Use reviewer_agent to finalize the content.
    The ultimate goal is a defined segment with insights and verified text that speaks to that segment.
    """,
    sub_agents=[analysis_agent, segmentation_agent, content_agent, reviewer_agent]
)

if __name__ == "__main__":
    root_agent.run()

import os
import asyncio
from typing import Annotated
import google.auth
import google.auth.transport.requests
from google.adk.tools import FunctionTool, google_search, McpToolset
from google.adk.integrations.api_registry import ApiRegistry
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams

# 1. Pure Function Tool
def calculate_area(
    length: Annotated[float, "The length of the rectangle"],
    width: Annotated[float, "The width of the rectangle"]
) -> float:
    """Calculates the area of a rectangle."""
    return length * width

calculate_area_tool = FunctionTool(calculate_area)

# 2. BigQuery MCP Toolset
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
# Default to the provided project ID if not set in env
if not PROJECT_ID:
    PROJECT_ID = "marketing-agent-01-491314"

MCP_SERVER_NAME = f"projects/{PROJECT_ID}/locations/global/mcpServers/google-bigquery.googleapis.com-mcp"

# Try to get toolset from API Registry first
bq_mcp_toolset = None
api_registry = ApiRegistry(PROJECT_ID)
try:
    bq_mcp_toolset = api_registry.get_toolset(
        mcp_server_name=MCP_SERVER_NAME
    )
except Exception as e:
    print(f"Warning: Could not retrieve BigQuery MCP toolset from registry: {e}")

# If registry fails, try direct HTTP connection to the BigQuery MCP endpoint
if not bq_mcp_toolset:
    try:
        # Get credentials and token
        creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
        auth_req = google.auth.transport.requests.Request()
        creds.refresh(auth_req)
        
        bq_mcp_toolset = McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://bigquery.googleapis.com/mcp",
                headers={
                    "Authorization": f"Bearer {creds.token}",
                    "Content-Type": "application/json",
                    "X-Goog-User-Project": PROJECT_ID
                }
            )
        )
        print("Successfully initialized direct BigQuery MCP toolset.")
    except Exception as e:
        print(f"Warning: Could not initialize direct BigQuery MCP toolset: {e}")

# 3. MCP (Model Context Protocol) Placeholder (Conceptual)
async def mcp_query(
    query: Annotated[str, "The query for the MCP server"]
) -> str:
    """Sends a query to an external MCP server and returns the result."""
    # This would typically use an MCP client to communicate with a server.
    # For now, we simulate a response.
    await asyncio.sleep(0.5)
    if "trends" in query.lower() or "high-value" in query.lower():
        return """
        Query Results:
        - Total High-Value Customers: 1,240
        - Top Purchase Categories: Electronics (45%), Home & Garden (30%), Fashion (25%)
        - Recent Trends: 20% increase in average order value for electronics over the last 30 days.
        - Churn Risk: 5% of this segment has not made a purchase in 60 days.
        """
    return f"MCP Response for: {query}"

mcp_query_tool = FunctionTool(mcp_query)

# 4. Google Search Grounding (Built-in)
# We re-export or use the built-in google_search tool.
search_tool = google_search

# For the base template, we include the real BigQuery MCP toolset if available
all_tools = [calculate_area_tool, mcp_query_tool, search_tool]
if bq_mcp_toolset:
    all_tools.append(bq_mcp_toolset)

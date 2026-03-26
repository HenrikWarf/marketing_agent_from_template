import asyncio
from typing import Annotated
from google.adk.tools import FunctionTool, google_search

# 1. Pure Function Tool
def calculate_area(
    length: Annotated[float, "The length of the rectangle"],
    width: Annotated[float, "The width of the rectangle"]
) -> float:
    """Calculates the area of a rectangle."""
    return length * width

calculate_area_tool = FunctionTool(calculate_area)

# 2. MCP (Model Context Protocol) Placeholder (Conceptual)
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

# 3. Real MCP Toolset Example (Commented out by default to avoid environment issues)
# This connects to a local MCP server (e.g., the filesystem server)
# To use this, ensure Node.js is installed and you have access to the registry.
"""
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool import StdioConnectionParams
from mcp import StdioServerParameters

mcp_toolset = McpToolset(
    connection_params=StdioConnectionParams(
        server_params=StdioServerParameters(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
        )
    )
)
"""

# 4. Google Search Grounding (Built-in)
# We re-export or use the built-in google_search tool.
search_tool = google_search

# For the base template, we use the conceptual tool instead of the real toolset
# to ensure it runs out-of-the-box without registry auth issues.
all_tools = [calculate_area_tool, mcp_query_tool, search_tool]

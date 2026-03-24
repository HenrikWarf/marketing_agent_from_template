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

# 2. MCP (Model Context Protocol) Placeholder
async def mcp_query(
    query: Annotated[str, "The query for the MCP server"]
) -> str:
    """Sends a query to an external MCP server and returns the result."""
    # This would typically use an MCP client to communicate with a server.
    # For now, we simulate a response.
    await asyncio.sleep(0.5)
    return f"MCP Response for: {query}"

mcp_query_tool = FunctionTool(mcp_query)

# 3. Google Search Grounding (Built-in)
# We re-export or use the built-in google_search tool.
search_tool = google_search

all_tools = [calculate_area_tool, mcp_query_tool, search_tool]

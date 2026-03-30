import os
import asyncio
from typing import Annotated
from google.adk.tools import FunctionTool, google_search, McpToolset
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams
from google.adk.agents.readonly_context import ReadonlyContext

# 1. Pure Function Tool
def calculate_area(
    length: Annotated[float, "The length of the rectangle"],
    width: Annotated[float, "The width of the rectangle"]
) -> float:
    """Calculates the area of a rectangle."""
    return length * width

calculate_area_tool = FunctionTool(calculate_area)

# BigQuery table configuration for marketing data
BQ_CUSTOMER_TABLE = os.getenv("BQ_CUSTOMER_TABLE", "marketing-agent-01-491314.customer_data_furniture.customer")

# Load table schema context
def get_customer_table_schema() -> str:
    """Returns the schema of the customer table for SQL query generation."""
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "marketing_agent", "customer_schema.json")
    try:
        with open(schema_path, "r") as f:
            return f.read()
    except Exception as e:
        return f"Error loading schema: {e}"

get_customer_table_schema_tool = FunctionTool(get_customer_table_schema)
def get_auth_headers(ctx: ReadonlyContext) -> dict[str, str]:
    """Provides refreshed auth headers for each MCP session with detailed logging."""
    try:
        import google.auth
        import google.auth.compute_engine
        import google.auth.transport.requests

        auth_req = google.auth.transport.requests.Request()
        
        # In a remote environment (Vertex AI), we should use Compute Engine credentials
        # to avoid any interactive login prompts that cause 404 redirects.
        try:
            creds = google.auth.compute_engine.Credentials(scopes=['https://www.googleapis.com/auth/cloud-platform'])
            creds.refresh(auth_req)
            print("Successfully refreshed Compute Engine credentials.")
        except Exception:
            # Fallback to default for local development
            creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
            creds.refresh(auth_req)
            print("Successfully refreshed default credentials.")

        return {
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json",
        }
    except Exception as e:
        print(f"CRITICAL: Error in header_provider: {e}")
        return {}

# Direct HTTP connection to the BigQuery MCP endpoint
bq_mcp_toolset = None
try:
    print("Initializing direct BigQuery MCP toolset...")
    bq_mcp_toolset = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url="https://bigquery.googleapis.com/mcp",
            # Adjusted timeouts for balance between speed and stability
            timeout=30.0,
            sse_read_timeout=300.0
        ),
        header_provider=get_auth_headers
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

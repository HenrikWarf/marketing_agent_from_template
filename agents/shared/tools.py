import os
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams

# ====================================================================
# BigQuery MCP Toolset (GCP-Native Authentication)
# ====================================================================

# Table configuration for marketing data (used in agent prompts)
BQ_CUSTOMER_TABLE = os.getenv("BQ_CUSTOMER_TABLE", "marketing-agent-01-491314.customer_data_furniture.customer")

# Define the BigQuery MCP Toolset
bq_mcp_toolset = None
try:
    bq_mcp_toolset = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url="https://bigquery.googleapis.com/mcp",
            # Use native ADK authentication for Agent Engine / Vertex AI.
            # This ensures the identity service correctly delegates permissions
            # to the BigQuery MCP endpoint without manual token refreshing.
            use_google_auth=True,
            timeout=60.0,
            sse_read_timeout=600.0
        )
    )
    print("Successfully initialized native BigQuery MCP toolset.")
except Exception as e:
    print(f"Warning: Could not initialize BigQuery MCP toolset: {e}")

# ====================================================================
# Global Tool Export
# ====================================================================

# Export only the BigQuery toolset to avoid 'Multiple tools' errors in remote engines
all_tools = []
if bq_mcp_toolset:
    all_tools.append(bq_mcp_toolset)

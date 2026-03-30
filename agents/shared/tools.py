import os
import google.auth
import google.auth.transport.requests
from google.adk.tools import McpToolset
from google.adk.tools.mcp_tool import StreamableHTTPConnectionParams
from google.adk.agents.readonly_context import ReadonlyContext

# ====================================================================
# BigQuery MCP Toolset (Hybrid Local/Remote Authentication)
# ====================================================================

# Table configuration for marketing data (used in agent prompts)
BQ_CUSTOMER_TABLE = os.getenv("BQ_CUSTOMER_TABLE", "marketing-agent-01-491314.customer_data_furniture.customer")

# Determine if we are truly running on GCP (Cloud Run / Agent Engine)
IS_ON_GCP = os.getenv("K_SERVICE") is not None

# Define the BigQuery MCP Toolset
bq_mcp_toolset = None

try:
    if IS_ON_GCP:
        # REMOTE: Use native ADK identity delegation (fastest on Vertex AI)
        bq_mcp_toolset = McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://bigquery.googleapis.com/mcp",
                use_google_auth=True,
                timeout=60.0,
                sse_read_timeout=600.0
            )
        )
    else:
        # LOCAL: Fetch token ONCE at startup to avoid per-call refresh latency
        print("Initializing BigQuery MCP for Local Dev (fetching initial token)...")
        creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
        auth_req = google.auth.transport.requests.Request()
        creds.refresh(auth_req)
        
        bq_mcp_toolset = McpToolset(
            connection_params=StreamableHTTPConnectionParams(
                url="https://bigquery.googleapis.com/mcp",
                headers={
                    "Authorization": f"Bearer {creds.token}",
                    "Content-Type": "application/json",
                },
                timeout=30.0,
                sse_read_timeout=300.0
            )
        )
        print("Successfully initialized local BigQuery MCP toolset with static token.")
except Exception as e:
    print(f"Warning: Could not initialize BigQuery MCP toolset: {e}")
    bq_mcp_toolset = None

# ====================================================================
# Global Tool Export
# ====================================================================

# Export only the BigQuery toolset
all_tools = []
if bq_mcp_toolset:
    all_tools.append(bq_mcp_toolset)

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

def get_auth_headers(ctx: ReadonlyContext) -> dict[str, str]:
    """
    Provides refreshed auth headers for each MCP session. 
    This mechanism is used for BOTH local and cloud environments, 
    ensuring that auth behavior is identical during testing.
    Uses Application Default Credentials (ADC) for automatic environment detection.
    """
    try:
        # Use Application Default Credentials (ADC) which works in both Local and Cloud.
        # It automatically detects Compute Engine, Cloud Run, GKE, and local gcloud ADC.
        creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
        auth_req = google.auth.transport.requests.Request()
        creds.refresh(auth_req)
        
        return {
            "Authorization": f"Bearer {creds.token}",
            "Content-Type": "application/json",
        }
    except Exception as e:
        print(f"CRITICAL: Error in BigQuery MCP header_provider: {e}")
        return {}

# Define the BigQuery MCP Toolset using the unified header_provider
bq_mcp_toolset = None

try:
    bq_mcp_toolset = McpToolset(
        connection_params=StreamableHTTPConnectionParams(
            url="https://bigquery.googleapis.com/mcp",
            # Timeouts balanced for BigQuery query execution times
            timeout=60.0,
            sse_read_timeout=600.0
        ),
        header_provider=get_auth_headers
    )
    print("Successfully initialized BigQuery MCP toolset with unified header_provider.")
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

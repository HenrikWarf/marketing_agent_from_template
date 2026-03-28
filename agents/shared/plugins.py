from typing import Any, Optional
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext

class BigQueryReflectRetryPlugin(ReflectAndRetryToolPlugin):
    """
    Custom retry plugin for BigQuery MCP that extracts errors from 
    successful tool responses that contain error fields.
    """
    
    async def extract_error_from_result(
        self, 
        *, 
        tool: BaseTool, 
        tool_args: dict[str, Any], 
        tool_context: ToolContext, 
        result: Any
    ) -> Optional[dict[str, Any]]:
        """
        MCP responses often return content with error information instead of raising exceptions.
        This method checks for those errors to trigger the retry logic.
        """
        # MCP result usually has a 'content' list
        if isinstance(result, dict) and "content" in result:
            for item in result["content"]:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "")
                    # Look for common BigQuery error indicators in the text
                    if "Error:" in text or "400 Bad Request" in text or "Invalid query" in text:
                        return {"error": text}
        
        # If the result itself has an error field
        if isinstance(result, dict) and "error" in result:
            return result
            
        return None

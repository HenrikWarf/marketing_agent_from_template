from typing import Any, Optional
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext

class BigQueryReflectRetryPlugin(ReflectAndRetryToolPlugin):
    """
    Custom retry plugin for BigQuery MCP that extracts errors from 
    successful tool responses that contain error fields.
    """
    
    async def extract_error_from_exception(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        exception: Exception,
    ) -> Optional[dict[str, Any]]:
        """
        Catch actual exceptions raised during the tool call.
        If it's a TaskGroup error, we want to retry it.
        """
        err_str = str(exception)
        if "TaskGroup" in err_str or "unhandled errors" in err_str:
            print(f"DEBUG: Caught TaskGroup exception in plugin: {err_str}")
            return {"error": f"Transient connection error (TaskGroup): {err_str}"}
        
        return None

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
        print(f"DEBUG: BigQueryReflectRetryPlugin checking result for tool: {tool.name}")
        
        # MCP result usually has a 'content' list
        if isinstance(result, dict) and "content" in result:
            for item in result["content"]:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "")
                    # Look for common BigQuery error indicators in the text
                    error_keywords = [
                        "Error:", "400 Bad Request", "Invalid query", 
                        "not found", "Permission denied", "Syntax error",
                        "TaskGroup", "unhandled errors"
                    ]
                    if any(kw in text for kw in error_keywords):
                        print(f"DEBUG: Found error keyword in result text: {text[:100]}...")
                        return {"error": text}
        
        # If the result itself has an error field
        if isinstance(result, dict) and "error" in result:
            print(f"DEBUG: Found error field in result: {result['error']}")
            return result
            
        return None

from typing import Any, Optional
import json
import logging
from google.adk.plugins import ReflectAndRetryToolPlugin
from google.adk.tools.base_tool import BaseTool
from google.adk.tools.tool_context import ToolContext

# Configure a separate logger for debugging plugins
plugin_logger = logging.getLogger("adk_plugins")
plugin_logger.setLevel(logging.DEBUG)
fh = logging.FileHandler("adk_plugins.log")
fh.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
plugin_logger.addHandler(fh)

class BigQueryReflectRetryPlugin(ReflectAndRetryToolPlugin):
    """
    Custom retry plugin for BigQuery MCP that extracts errors from 
    successful tool responses that contain error fields, and flattens
    the complex BigQuery nested JSON format into simple list of dicts.
    """

    async def after_tool_callback(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        result: Any,
    ) -> Optional[dict[str, Any]]:
        """Handles successful tool calls and flattens BigQuery results."""
        plugin_logger.debug(f"after_tool_callback for {tool.name}")
        
        # In ADK, 'result' at this point might be a dict with 'content' (from McpToolset)
        # or a raw dict (if already processed).
        
        # 1. Check for errors first
        error = await self.extract_error_from_result(
            tool=tool, tool_args=tool_args, tool_context=tool_context, result=result
        )
        if error:
            plugin_logger.warning(f"Error detected in result for {tool.name}: {error}")
            return await self._handle_tool_error(tool, tool_args, tool_context, error)

        # 2. Reset failures on success
        await self._reset_failures_for_tool(tool_context, tool.name)

        # 3. Flatten BigQuery nested format if present
        # Result from McpToolset usually looks like: {'content': [{'type': 'text', 'text': '...'}]}
        if isinstance(result, dict) and "content" in result:
            modified = False
            for item in result["content"]:
                if isinstance(item, dict) and item.get("type") == "text":
                    try:
                        text_val = item.get("text", "").strip()
                        if text_val.startswith("{") and '"schema"' in text_val and '"rows"' in text_val:
                            data = json.loads(text_val)
                            if isinstance(data, dict) and "schema" in data and "rows" in data:
                                flattened = self._flatten_bq(data)
                                # Replace the text content with a simplified JSON array string
                                item["text"] = json.dumps(flattened, indent=2)
                                modified = True
                                plugin_logger.debug(f"SUCCESS: Flattened {len(flattened)} rows for {tool.name}")
                    except (json.JSONDecodeError, KeyError, TypeError) as e:
                        plugin_logger.error(f"Failed to parse text as JSON for flattening: {e}")
                        continue
            if modified:
                return result

        # If it's a raw dict from a standard tool (not MCP)
        elif isinstance(result, dict) and "schema" in result and "rows" in result:
            flattened = self._flatten_bq(result)
            return {"result": flattened}

        return None

    def _flatten_bq(self, data: dict) -> list[dict]:
        """Converts BQ nested row format to a list of flat dictionaries."""
        try:
            if "schema" not in data or "fields" not in data["schema"]:
                return [data]
                
            fields = [f["name"] for f in data["schema"]["fields"]]
            rows = []
            
            # Limit to 50 rows for agent context safety
            MAX_ROWS = 50
            raw_rows = data.get("rows", [])
            truncated = len(raw_rows) > MAX_ROWS
            
            for row in raw_rows[:MAX_ROWS]:
                values = [field.get("v") for field in row.get("f", [])]
                processed_values = []
                for v in values:
                    if v is None:
                        processed_values.append(None)
                    else:
                        try:
                            # Handle numeric strings
                            if "." in str(v): processed_values.append(float(v))
                            else: processed_values.append(int(v))
                        except (ValueError, TypeError):
                            processed_values.append(v)
                rows.append(dict(zip(fields, processed_values)))
            
            if truncated:
                plugin_logger.warning(f"Truncated {len(raw_rows)} rows to {MAX_ROWS} for LLM safety.")
                # We could append a metadata row or similar, but for now we just log it.
                
            return rows
        except Exception as e:
            plugin_logger.error(f"Error during flattening logic: {e}")
            return [data]

    async def extract_error_from_exception(
        self,
        *,
        tool: BaseTool,
        tool_args: dict[str, Any],
        tool_context: ToolContext,
        exception: Exception,
    ) -> Optional[dict[str, Any]]:
        err_str = str(exception)
        plugin_logger.debug(f"Caught exception in plugin: {err_str}")
        if "TaskGroup" in err_str or "unhandled errors" in err_str:
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
        if isinstance(result, dict) and "content" in result:
            for item in result["content"]:
                if isinstance(item, dict) and item.get("type") == "text":
                    text = item.get("text", "")
                    error_keywords = [
                        "Error:", "400 Bad Request", "Invalid query", 
                        "not found", "Permission denied", "Syntax error",
                        "TaskGroup", "unhandled errors", "McpError"
                    ]
                    # Only match if keyword is at the start of the text or follows a newline
                    # This prevents "City: Newport" or names from triggering retries
                    text_lower = text.strip()
                    if any(text_lower.startswith(kw) or f"\n{kw}" in text_lower for kw in error_keywords):
                        plugin_logger.warning(f"Error keyword detected in tool output: {text_lower[:100]}")
                        return {"error": text}
        if isinstance(result, dict) and "error" in result:
            return result
        return None

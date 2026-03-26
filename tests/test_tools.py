import pytest
from agents.shared.tools import calculate_area, mcp_query

def test_calculate_area():
    assert calculate_area(5.0, 4.0) == 20.0
    assert calculate_area(0.0, 10.0) == 0.0
    assert calculate_area(2.5, 2.0) == 5.0

@pytest.mark.asyncio
async def test_mcp_query():
    # Test for trend/high-value queries
    result = await mcp_query("What are the recent trends for high-value customers?")
    assert "Query Results:" in result
    assert "Total High-Value Customers:" in result
    
    # Test for other queries
    result = await mcp_query("Tell me about the weather.")
    assert "MCP Response for: Tell me about the weather." in result

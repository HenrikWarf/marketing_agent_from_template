from app.simple_agent import agent as simple_agent
from app.subagents import root_agent
from app.loop import loop_agent

def test_agent_initialization():
    assert simple_agent.name == "simple_agent"
    assert root_agent.name == "root_agent"
    assert loop_agent.name == "loop_agent"

def test_subagent_configuration():
    # Check if subagents are correctly linked
    agent_names = [a.name for a in root_agent.sub_agents]
    assert "search_agent" in agent_names
    assert "calc_agent" in agent_names

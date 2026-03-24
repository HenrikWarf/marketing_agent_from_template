from agents.simple_agent.agent import agent as simple_agent
from agents.subagents_agent.agent import root_agent
from agents.sequential_agent.agent import sequential_agent
from agents.loop_agent.agent import loop_agent

def test_agent_initialization():
    assert simple_agent.name == "simple_agent"
    assert root_agent.name == "root_agent"
    assert sequential_agent.name == "sequential_agent"
    assert loop_agent.name == "loop_agent"

def test_subagent_configuration():
    # Check if subagents are correctly linked
    agent_names = [a.name for a in root_agent.sub_agents]
    assert "search_agent" in agent_names
    assert "calc_agent" in agent_names

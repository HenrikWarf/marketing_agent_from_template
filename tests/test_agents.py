from agents.marketing_agent.agent import root_agent as marketing_agent

def test_marketing_agent_initialization():
    assert marketing_agent.name == "marketing_manager"
    assert len(marketing_agent.sub_agents) == 4
    
    sub_agent_names = [a.name for a in marketing_agent.sub_agents]
    assert "analysis_agent" in sub_agent_names
    assert "segmentation_agent" in sub_agent_names
    assert "content_agent" in sub_agent_names
    assert "reviewer_agent" in sub_agent_names

def test_marketing_agent_description():
    assert "marketing manager" in marketing_agent.instruction.lower()

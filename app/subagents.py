from google.adk import Agent
from app.tools import calculate_area, search_tool

# Subagent for specific tasks (e.g., searching)
search_agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    instruction="You are a research expert. Use the search tool to find information.",
    tools=[search_tool]
)

# Subagent for specific tasks (e.g., calculations)
calc_agent = Agent(
    name="calc_agent",
    model="gemini-2.0-flash",
    instruction="You are a math expert. Use the area calculator.",
    tools=[calculate_area]
)

# Root agent coordinating subagents
root_agent = Agent(
    name="root_agent",
    model="gemini-2.0-flash",
    instruction="You are a coordinator. Delegate research to the search_agent and math to the calc_agent.",
    agents=[search_agent, calc_agent]
)

if __name__ == "__main__":
    root_agent.run()

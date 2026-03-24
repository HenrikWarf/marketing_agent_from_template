from google.adk import Agent
from agents.shared.tools import search_tool

# Step 1: Research Agent
researcher = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    instruction="Research the topic provided and provide a detailed summary.",
    tools=[search_tool]
)

# Step 2: Analyst Agent
analyst = Agent(
    name="analyst",
    model="gemini-2.0-flash",
    instruction="Analyze the research summary and identify key insights.",
)

# Step 3: Writer Agent
writer = Agent(
    name="writer",
    model="gemini-2.0-flash",
    instruction="Write a short report based on the insights provided.",
)

# Sequential agent that runs these in order
sequential_agent = Agent(
    name="sequential_agent",
    model="gemini-2.0-flash",
    instruction="Run researcher, analyst, and then writer in order.",
    sub_agents=[researcher, analyst, writer],
)

if __name__ == "__main__":
    # In ADK, sequential flows can be triggered as part of a root agent's logic.
    sequential_agent.run()

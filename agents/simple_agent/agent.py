from google.adk import Agent
from agents.shared.tools import search_tool

# Simple LLM Agent with basic tools
root_agent = Agent(
    name="simple_agent",
    model="gemini-2.0-flash", # Default for quick testing
    instruction="You are a helpful assistant. Use the search tool when necessary.",
    tools=[search_tool]
)

if __name__ == "__main__":
    # This allows running the agent directly for simple CLI interaction.
    root_agent.run()

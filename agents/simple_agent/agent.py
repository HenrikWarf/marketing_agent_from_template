from google.adk import Agent
from agents.shared.tools import all_tools

# Simple LLM Agent with basic tools
agent = Agent(
    name="simple_agent",
    model="gemini-2.0-flash", # Default for quick testing
    instruction="You are a helpful assistant. Use tools when necessary.",
    tools=all_tools
)

if __name__ == "__main__":
    # This allows running the agent directly for simple CLI interaction.
    agent.run()

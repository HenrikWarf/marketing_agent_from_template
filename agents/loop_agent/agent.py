from google.adk import Agent
from agents.shared.tools import all_tools

# Loop Agent example for iterative refinement
# This agent will try to refine its output until it's satisfied.
loop_agent = Agent(
    name="loop_agent",
    model="gemini-2.0-flash",
    instruction="""You are a refinement expert. 
    1. Propose a solution to the user's problem.
    2. Critique your own solution.
    3. Revise the solution based on the critique.
    4. Repeat until you are confident the solution is optimal.
    Include 'OPTIMAL SOLUTION REACHED' in your final response.
    """,
    tools=all_tools
)

if __name__ == "__main__":
    loop_agent.run()

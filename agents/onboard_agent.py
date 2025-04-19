from crewai import Crew, Agent, Task
from crewai_tools import tool
import yaml

# Load agent config
with open("config/agents.yaml", "r") as f:
    agents_data = yaml.safe_load(f)

# Create agents
agents = []
for name, data in agents_data.items():
    agents.append(Agent(
        name=name.capitalize(),
        role=data.get("role", ""),
        goal=data.get("goal", ""),
        backstory=data.get("backstory", ""),
        allow_delegation=data.get("allow_delegation", False),
        verbose=True
    ))

# Define task
task = Task(
    description="Design a scalable architecture for a multi-agent AI platform called AnalystAI. Include RAG capability, a visual UI, and robust orchestration strategy.",
    expected_output="A Markdown-formatted technical spec for AnalystAI including agent roles, tools, infra layers, and sandboxing strategy.",
    agents=agents
)

# Run the crew
crew = Crew(
    agents=agents,
    tasks=[task],
    verbose=True
)

result = crew.kickoff()
print("=== Final Output ===\n", result)

from google.adk.agents import Agent
from vana.tools.agent_tools import (
    coordinate_task_tool,
    design_agent_architecture_tool,
    build_explainable_ui_tool,
    deploy_self_healing_backend_tool,
    simulate_user_failures_tool,
    craft_onboarding_portal_tool,
    conduct_daily_checkin_tool
)
from vana.tools.rag_tools import search_knowledge_tool
from vana.config.settings import MODEL

# Ben - Project Lead & DevOps Strategist
ben = Agent(
    name="ben",
    llm={"model": MODEL},
    description="Project Lead & DevOps Strategist",
    system_instruction="""You are Ben — the system thinker. You blend DevOps pragmatism with product vision,
    ensuring every part of the stack ships clean, secure, and on-schedule. You orchestrate progress
    through review, mentorship, and decisive calls. Everything flows through you before it launches.

    Your goal is to guide AnalystAI to production with scalable systems, consistent releases, and
    cross-agent harmony.""",
    tools=[coordinate_task_tool, conduct_daily_checkin_tool, search_knowledge_tool]
)

# Rhea - Meta-Architect of Agent Intelligence
rhea = Agent(
    name="rhea",
    llm={"model": MODEL},
    description="Meta-Architect of Agent Intelligence",
    system_instruction="""You are Rhea — the brain builder. You don't just implement AI pipelines; you invent new
    ways agents can think, collaborate, and improve. You architect feedback loops, tool handoffs, and
    memory systems that make AnalystAI smarter over time. You see agent orchestration as choreography.

    Your goal is to design adaptive, evolving agent workflows using LangChain, CrewAI, and custom tools.""",
    tools=[design_agent_architecture_tool, search_knowledge_tool]
)

# Max - Interaction Engineer
max = Agent(
    name="max",
    llm={"model": MODEL},
    description="Interaction Engineer",
    system_instruction="""You are Max — a translator of AI cognition. You don't build UIs — you build intuition.

    Your goal is to create interfaces that visualize agent decision-making in real-time.""",
    tools=[build_explainable_ui_tool, search_knowledge_tool]
)

# Sage - Platform Automator
sage = Agent(
    name="sage",
    llm={"model": MODEL},
    description="Platform Automator",
    system_instruction="""You are Sage — master of the unseen. Your infrastructure is invisible when it's perfect.

    Your goal is to deploy infrastructure that heals, scales, and evolves.""",
    tools=[deploy_self_healing_backend_tool, search_knowledge_tool]
)

# Kai - Edge Case Hunter
kai = Agent(
    name="kai",
    llm={"model": MODEL},
    description="Edge Case Hunter",
    system_instruction="""You are Kai — the system's devil's advocate. You model the worst possible scenarios
    and break things early.

    Your goal is to ensure agents behave reliably through simulation and chaos testing.""",
    tools=[simulate_user_failures_tool, search_knowledge_tool]
)

# Juno - Story Engineer
juno = Agent(
    name="juno",
    llm={"model": MODEL},
    description="Story Engineer",
    system_instruction="""You are Juno — the system's voice. You turn complexity into clarity.

    Your goal is to design onboarding, documentation, and internal UX.""",
    tools=[craft_onboarding_portal_tool, search_knowledge_tool]
)

# Ben has all other agents as sub-agents (delegation)
ben.sub_agents = [rhea, max, sage, kai, juno]

# Make Ben the root agent
root_agent = ben

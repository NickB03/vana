"""
VANA Orchestrator - Pure Delegation Pattern
Works around ADK limitation by using ONLY AgentTools, no built-in tools
"""

from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from lib.logging_config import get_logger

# Import specialist factory functions
from lib.agents.specialists.architecture_specialist import create_architecture_specialist
from lib.agents.specialists.data_science_specialist import create_data_science_specialist
from lib.agents.specialists.devops_specialist import create_devops_specialist
from lib.agents.specialists.research_specialist import create_research_specialist
from .simple_search_agent import create_simple_search_agent

logger = get_logger("vana.orchestrator_pure_delegation")

def create_pure_delegation_orchestrator() -> LlmAgent:
    """
    Create orchestrator that uses ONLY AgentTools to avoid ADK limitation.
    No built-in tools at orchestrator level.
    """
    
    # Create specialist instances
    simple_search = create_simple_search_agent()
    research_specialist = create_research_specialist()
    architecture_specialist = create_architecture_specialist()
    data_science_specialist = create_data_science_specialist()
    devops_specialist = create_devops_specialist()
    
    logger.info("✅ Created specialist instances for pure delegation pattern")
    
    instruction = """You are VANA's orchestrator. Route requests to the right specialist.

You MUST delegate ALL requests. You have NO direct tools.

ROUTING RULES:

**Simple Search** → Basic facts, time, weather, definitions
**Research** → Complex topics needing multiple sources
**Architecture** → System design, code patterns, tech decisions
**Data Science** → Data analysis, ML, statistics
**DevOps** → Deployment, infrastructure, monitoring

Pick ONE specialist and delegate the ENTIRE request."""
    
    return LlmAgent(
        name="vana_orchestrator",
        model="gemini-2.5-flash",
        description="VANA's pure delegation orchestrator using only AgentTools",
        instruction=instruction,
        tools=[
            agent_tool.AgentTool(agent=simple_search),
            agent_tool.AgentTool(agent=research_specialist),
            agent_tool.AgentTool(agent=architecture_specialist),
            agent_tool.AgentTool(agent=data_science_specialist),
            agent_tool.AgentTool(agent=devops_specialist)
        ]
        # NO built-in tools, ONLY AgentTools to avoid ADK limitation
    )

# Create the orchestrator instance
orchestrator_pure = create_pure_delegation_orchestrator()

# ADK expects root_agent
root_agent = orchestrator_pure

__all__ = ["orchestrator_pure", "root_agent"]
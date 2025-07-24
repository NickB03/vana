"""
VANA Orchestrator with Memory Support

This orchestrator includes memory callbacks for automatic detection and
storage of important user information across sessions.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import agent_tool
from lib.logging_config import get_logger
from lib.agents.callbacks.memory_callbacks import (
    memory_detection_callback,
    memory_context_injection_callback
)

# Import specialist factory functions
from lib.agents.specialists.architecture_specialist import create_architecture_specialist
from lib.agents.specialists.data_science_specialist import create_data_science_specialist
from lib.agents.specialists.devops_specialist import create_devops_specialist
from lib.agents.specialists.research_specialist import create_research_specialist
from .simple_search_agent import create_simple_search_agent

logger = get_logger("vana.orchestrator_with_memory")

def create_memory_orchestrator() -> LlmAgent:
    """
    Create orchestrator with memory capabilities.
    
    This orchestrator automatically:
    - Detects and saves important user information
    - Injects user context before processing requests
    - Maintains cross-session memory
    """
    
    # Create specialist instances
    simple_search = create_simple_search_agent()
    research_specialist = create_research_specialist()
    architecture_specialist = create_architecture_specialist()
    data_science_specialist = create_data_science_specialist()
    devops_specialist = create_devops_specialist()
    
    logger.info("✅ Created specialist instances with memory support")
    
    # Enhanced instruction with memory awareness but preserved routing logic
    instruction = """You are VANA's memory-aware orchestrator. I help route your requests to the right specialist.

USER CONTEXT (Available for reference):
- Name: {user:name?} | Role: {user:role?}
- Tech Stack: {user:tech_stack?} | Experience: {user:experience?}
- Current Projects: {user:current_projects?}
- Active Challenges: {user:current_challenge?}
- Previous Topics: {user:topics_of_interest?}

IMMUTABLE ROUTING RULES:
1. Analyze the QUERY TYPE first (not user expertise)
2. Route based on what's being asked, not who's asking
3. One query = One specialist (no splitting)

SPECIALIST ASSIGNMENTS:
**Simple Search** → Facts, time, weather, definitions, "what is X?", "do you know my Y?"
**Research** → Complex topics needing multiple sources, "research X", "find information about Y"
**Architecture** → System design, patterns, "how to structure X", "best practices for Y"
**Data Science** → Data analysis, ML, statistics, "analyze this data", "predict X"
**DevOps** → Deployment, infrastructure, CI/CD, "deploy X", "configure Y"

ROUTING PROCESS:
1. Identify query type from the request
2. Select specialist based on query type (ignore user expertise for routing)
3. Delegate with a brief, relevant mention of context if helpful

GOOD EXAMPLES:
- "What is Docker?" → Simple Search (even if user is a DevOps expert)
- "Research Docker orchestration options" → Research specialist
- "How to structure a Docker-based microservices architecture?" → Architecture
- "Deploy my Docker app to Kubernetes" → DevOps

CONTEXT USAGE:
- Mention user's name if known: "I'll help you with that, {user:name?}"
- Add ONE relevant context point when delegating if it helps
- Let the specialist use the full context for their response

CRITICAL: The query type determines the specialist. User expertise affects HOW the specialist responds, not WHICH specialist to choose.

Always delegate the ENTIRE request to exactly ONE specialist."""
    
    return LlmAgent(
        name="vana_memory_orchestrator",
        model="gemini-2.5-flash",
        description="VANA's memory-aware orchestrator with automatic information detection",
        instruction=instruction,
        tools=[
            agent_tool.AgentTool(agent=simple_search),
            agent_tool.AgentTool(agent=research_specialist),
            agent_tool.AgentTool(agent=architecture_specialist),
            agent_tool.AgentTool(agent=data_science_specialist),
            agent_tool.AgentTool(agent=devops_specialist)
        ],
        # Add memory callbacks
        before_agent_callback=memory_context_injection_callback,
        after_agent_callback=memory_detection_callback
    )

# Create the orchestrator instance
orchestrator_memory = create_memory_orchestrator()

# ADK expects root_agent
root_agent = orchestrator_memory

__all__ = ["orchestrator_memory", "root_agent", "create_memory_orchestrator"]
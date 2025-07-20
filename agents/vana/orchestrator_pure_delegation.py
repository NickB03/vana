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
from lib.agents.specialists.security_specialist import create_security_specialist
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
    security_specialist = create_security_specialist()
    architecture_specialist = create_architecture_specialist()
    data_science_specialist = create_data_science_specialist()
    devops_specialist = create_devops_specialist()
    
    logger.info("✅ Created specialist instances for pure delegation pattern")
    
    instruction = """You are VANA's intelligent orchestrator that routes ALL requests to appropriate specialists.

IMPORTANT: You do NOT have direct access to any tools. You MUST delegate to specialists.

ROUTING GUIDELINES:

**Simple Search Agent** - Use for BASIC queries:
- Time and timezone questions
- Weather information
- Basic definitions
- Simple facts
- Current prices or scores
- Quick lookups

**Research Specialist** - Use for COMPLEX research:
- Multi-source investigations
- Academic or scientific research
- Historical analysis
- Comparative studies
- Industry research
- Topics requiring synthesis

**Security Specialist** - Use for:
- Security assessments and vulnerabilities
- Authentication and authorization
- Threat modeling and security architecture
- Compliance and standards
- Security best practices

**Architecture Specialist** - Use for:
- System design and architecture
- Code structure and patterns
- Technology decisions
- Scalability and performance design
- API design and integration patterns

**Data Science Specialist** - Use for:
- Data analysis and statistics
- Machine learning and AI
- Predictive modeling
- Data visualization
- Statistical testing

**DevOps Specialist** - Use for:
- Deployment and CI/CD
- Infrastructure and cloud
- Monitoring and logging
- Performance optimization
- Container orchestration

DECISION PROCESS:
1. Identify the domain of the request
2. Choose the MOST appropriate specialist
3. Delegate the ENTIRE request to that specialist
4. Return the specialist's complete response

Remember: You MUST delegate every request. You cannot answer directly."""
    
    return LlmAgent(
        name="vana_orchestrator_pure_delegation",
        model="gemini-2.0-flash",
        description="VANA's pure delegation orchestrator using only AgentTools",
        instruction=instruction,
        tools=[
            agent_tool.AgentTool(agent=simple_search),
            agent_tool.AgentTool(agent=research_specialist),
            agent_tool.AgentTool(agent=security_specialist),
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
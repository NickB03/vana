"""
Agent Team Orchestration

This module provides the agent team orchestration for the VANA project,
including task routing, context passing, and result synthesis.
"""

import os
import logging
from typing import Dict, Any, List, Optional
from google.adk.agents import Agent

# Import orchestration components
from vana.orchestration.task_router import TaskRouter
from vana.orchestration.result_synthesizer import ResultSynthesizer
from vana.context.context_manager import ContextManager

# Import agent tools
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

# Set up logging
logger = logging.getLogger(__name__)

# Load knowledge usage guidelines
KNOWLEDGE_USAGE_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'instructions', 'knowledge_usage.md')
KNOWLEDGE_USAGE_GUIDELINES = ""

try:
    with open(KNOWLEDGE_USAGE_PATH, 'r') as f:
        KNOWLEDGE_USAGE_GUIDELINES = f.read()
except Exception as e:
    logger.warning(f"Could not load knowledge usage guidelines: {str(e)}")
    KNOWLEDGE_USAGE_GUIDELINES = """# Knowledge Base Usage Guidelines

When using the knowledge base:
1. Formulate clear, specific queries
2. Cite sources when providing information
3. Verify information from multiple sources when possible
4. Clearly state when information is not found
5. Integrate knowledge base information with your own reasoning
"""

class AgentTeam:
    """Agent team orchestration for VANA."""
    
    def __init__(self):
        """Initialize the agent team."""
        # Initialize orchestration components
        self.task_router = TaskRouter()
        self.result_synthesizer = ResultSynthesizer()
        self.context_manager = ContextManager()
        
        # Initialize agents
        self._initialize_agents()
        
        # Initialize agent state
        self.current_context = None
    
    def _initialize_agents(self):
        """Initialize the agent team."""
        # Vana - Project Lead & DevOps Strategist
        self.vana = Agent(
            name="vana",
            model=MODEL,
            description="Project Lead & DevOps Strategist",
            instruction=f"""# Project Vana — Lead Developer Role

## Identity

You are **Vana**, Lead Developer, Architect, and Strategist for Project Vana.
You are a technical leader responsible for driving execution, maintaining project quality, and ensuring critical systems thinking.
You operate with autonomy, tactical precision, and a collaborative but independent mindset.

Nick is technical but not a coder. You support strategic advancement through clear actions, independent analysis, and rigor, not agreement or flattery.

## Core Responsibilities

- Progress Project Vana's goals with autonomy and initiative
- Manage integrations and outputs of Auggie (augment code agent)
- Maintain clean project hygiene across code, documentation, and architecture
- Execute real-world system changes through GitHub API and verified automation paths
- Prioritize finding existing solutions before building new ones
- Actively prevent risks through early identification and escalation

## Source of Truth

Default repository unless otherwise specified:
- Owner: NickB03
- Repo: vana
- URL: https://github.com/NickB03/vana

Vana is expected to:
- Sync latest GitHub commits, branches, files and review updated documentation on Context7 via MCP before beginning work
- Confirm each action visibly (branch, commit SHA, files updated, push status)
- Work from live, verified repository data, not inferred memory
- Leverage web search for up-to-date information when needed

## Knowledge Access

You have access to multiple knowledge sources:
- **Vector Search**: For semantic similarity search across project documentation
- **Knowledge Graph**: Via Context7 MCP server for structured knowledge and relationships
- **Web Search**: For retrieving up-to-date information from the internet
- **GitHub Repository**: For accessing the latest code and documentation

{KNOWLEDGE_USAGE_GUIDELINES}

## Personality and Interaction Principles

- Communicate with energy, clarity, and focus — professional but not robotic
- Avoid praise, affirmations, or agreement without validation
- Prioritize critical thinking, counterexamples, and challenge assumptions when necessary
- Maintain an engaged tone: brief wit is acceptable if it does not distract from shipping
            """,
            tools=[coordinate_task_tool, conduct_daily_checkin_tool, search_knowledge_tool]
        )
        
        # Rhea - Meta-Architect of Agent Intelligence
        self.rhea = Agent(
            name="rhea",
            model=MODEL,
            description="Meta-Architect of Agent Intelligence",
            instruction=f"""You are Rhea — the brain builder. You don't just implement AI pipelines; you invent new
            ways agents can think, collaborate, and improve. You architect feedback loops, tool handoffs, and
            memory systems that make VANA smarter over time. You see agent orchestration as choreography.

            Your goal is to design adaptive, evolving agent workflows using LangChain, CrewAI, and custom tools.

            You have access to a shared knowledge base through Vector Search.
            Use this knowledge base to provide accurate information about the system architecture,
            implementation details, and agent roles.

            {KNOWLEDGE_USAGE_GUIDELINES}
            """,
            tools=[design_agent_architecture_tool, search_knowledge_tool]
        )
        
        # Max - Interaction Engineer
        self.max = Agent(
            name="max",
            model=MODEL,
            description="Interaction Engineer",
            instruction=f"""You are Max — a translator of AI cognition. You don't build UIs — you build intuition.

            Your goal is to create interfaces that visualize agent decision-making in real-time.

            You have access to a shared knowledge base through Vector Search.
            Use this knowledge base to provide accurate information about the system architecture,
            implementation details, and agent roles.

            {KNOWLEDGE_USAGE_GUIDELINES}
            """,
            tools=[build_explainable_ui_tool, search_knowledge_tool]
        )
        
        # Sage - Platform Automator
        self.sage = Agent(
            name="sage",
            model=MODEL,
            description="Platform Automator",
            instruction=f"""You are Sage — master of the unseen. Your infrastructure is invisible when it's perfect.

            Your goal is to deploy infrastructure that heals, scales, and evolves.

            You have access to a shared knowledge base through Vector Search.
            Use this knowledge base to provide accurate information about the system architecture,
            implementation details, and agent roles.

            {KNOWLEDGE_USAGE_GUIDELINES}
            """,
            tools=[deploy_self_healing_backend_tool, search_knowledge_tool]
        )
        
        # Kai - Edge Case Hunter
        self.kai = Agent(
            name="kai",
            model=MODEL,
            description="Edge Case Hunter",
            instruction=f"""You are Kai — the system's devil's advocate. You model the worst possible scenarios
            and break things early.

            Your goal is to ensure agents behave reliably through simulation and chaos testing.

            You have access to a shared knowledge base through Vector Search.
            Use this knowledge base to provide accurate information about the system architecture,
            implementation details, and agent roles.

            {KNOWLEDGE_USAGE_GUIDELINES}
            """,
            tools=[simulate_user_failures_tool, search_knowledge_tool]
        )
        
        # Juno - Story Engineer
        self.juno = Agent(
            name="juno",
            model=MODEL,
            description="Story Engineer",
            instruction=f"""You are Juno — the system's voice. You turn complexity into clarity.

            Your goal is to design onboarding, documentation, and internal UX.

            You have access to a shared knowledge base through Vector Search.
            Use this knowledge base to provide accurate information about the system architecture,
            implementation details, and agent roles.

            {KNOWLEDGE_USAGE_GUIDELINES}
            """,
            tools=[craft_onboarding_portal_tool, search_knowledge_tool]
        )
        
        # Vana has all other agents as sub-agents (delegation)
        self.vana.sub_agents = [self.rhea, self.max, self.sage, self.kai, self.juno]
        
        # Create agent map
        self.agents = {
            "vana": self.vana,
            "rhea": self.rhea,
            "max": self.max,
            "sage": self.sage,
            "kai": self.kai,
            "juno": self.juno
        }
        
        # Set root agent
        self.root_agent = self.vana
    
    def route_task(self, task: str) -> str:
        """
        Route a task to the appropriate agent.
        
        Args:
            task: Task description
            
        Returns:
            Agent ID
        """
        agent_id, confidence = self.task_router.route_task(task)
        logger.info(f"Task '{task}' routed to agent '{agent_id}' with confidence {confidence:.2f}")
        return agent_id
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """
        Get an agent by ID.
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Agent object or None if not found
        """
        return self.agents.get(agent_id)
    
    def create_context(self, user_id: str, session_id: str) -> Dict[str, Any]:
        """
        Create a new context for a conversation.
        
        Args:
            user_id: User ID
            session_id: Session ID
            
        Returns:
            Context object
        """
        self.current_context = self.context_manager.create_context(user_id, session_id)
        return self.current_context.serialize()
    
    def synthesize_results(self, results: List[Dict[str, Any]]) -> str:
        """
        Synthesize results from multiple agents.
        
        Args:
            results: List of results from agents
            
        Returns:
            Synthesized result
        """
        synthesized = self.result_synthesizer.synthesize(results)
        return self.result_synthesizer.format(synthesized)
    
    def delegate_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Delegate a task to the appropriate agent.
        
        Args:
            task: Task description
            context: Context object (optional)
            
        Returns:
            Result from the agent
        """
        # Route task to appropriate agent
        agent_id = self.route_task(task)
        agent = self.get_agent(agent_id)
        
        if not agent:
            logger.error(f"Agent '{agent_id}' not found")
            return {
                "agent": "vana",
                "content": f"Error: Agent '{agent_id}' not found",
                "confidence": 0.0
            }
        
        # Set context if provided
        if context:
            if not self.current_context:
                # Deserialize context
                self.current_context = self.context_manager.deserialize(context)
            
            # Add task to context
            self.current_context.add_data("task", task)
            self.current_context.add_data("agent", agent_id)
            
            # Save context
            self.context_manager.save_context(self.current_context)
        
        # Execute task
        try:
            logger.info(f"Delegating task to agent '{agent_id}': {task}")
            response = agent.generate_content(task)
            
            # Format result
            result = {
                "agent": agent_id,
                "content": response.text,
                "confidence": 0.9  # Default confidence
            }
            
            # Update context if available
            if self.current_context:
                self.current_context.add_data("result", result)
                self.context_manager.save_context(self.current_context)
            
            return result
        except Exception as e:
            logger.error(f"Error delegating task to agent '{agent_id}': {str(e)}")
            return {
                "agent": agent_id,
                "content": f"Error: {str(e)}",
                "confidence": 0.0
            }
    
    def execute_task(self, task: str, user_id: str = "user", session_id: str = None) -> str:
        """
        Execute a task using the agent team.
        
        Args:
            task: Task description
            user_id: User ID (default: "user")
            session_id: Session ID (optional, will be generated if not provided)
            
        Returns:
            Result from the agent team
        """
        # Create session ID if not provided
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())
        
        # Create context
        context = self.create_context(user_id, session_id)
        
        # Delegate task
        result = self.delegate_task(task, context)
        
        # Return result
        return result["content"]

# Create agent team instance
agent_team = AgentTeam()

# Export root agent for ADK
root_agent = agent_team.root_agent

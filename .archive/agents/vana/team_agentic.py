"""
VANA Agentic AI - Phase 1 Implementation
Activating dormant infrastructure and creating hierarchical agent system.
Following Google ADK best practices with proper agent hierarchy.
"""

import os
import sys

from dotenv import load_dotenv

# Load environment variables
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(project_root, ".env.local")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)

from google.adk.agents import LlmAgent

from lib._shared_libraries.adk_memory_service import get_adk_memory_service

# Import essential tools for chat layer
from lib._tools import adk_analyze_task, adk_transfer_to_agent
from lib.logging_config import get_logger

logger = get_logger("vana.agents.agentic")

# Import all specialist agents (activating dormant infrastructure)
try:
    from agents.data_science.specialist import data_science_specialist

    # Import the hierarchical task manager
    from agents.orchestration.hierarchical_task_manager import create_hierarchical_task_manager
    from agents.specialists.architecture_specialist import architecture_specialist
    from agents.specialists.devops_specialist import devops_specialist
    from agents.specialists.qa_specialist import qa_specialist
    from agents.specialists.ui_specialist import ui_specialist

    logger.info("✅ All specialist agents and orchestration components imported successfully")
except ImportError as e:
    logger.error(f"Failed to import specialist agents: {e}")
    raise

# Create the Master Orchestrator using existing HierarchicalTaskManager
master_orchestrator = create_hierarchical_task_manager()

# Enhance the orchestrator with all specialist agents
master_orchestrator.sub_agents = [
    data_science_specialist,
    architecture_specialist,
    devops_specialist,
    qa_specialist,
    ui_specialist,
]

# Create the VANA Chat Agent (minimal tools, user-facing)
vana_chat_agent = LlmAgent(
    name="VANA_Chat",
    model=os.getenv("VANA_MODEL", "gemini-2.5-flash"),
    description="VANA's conversational interface for natural user interaction",
    instruction="""You are VANA, a friendly and intelligent AI assistant. Your role is to:

1. **Understand User Intent**: Parse what the user is asking for
2. **Maintain Conversation**: Keep the chat natural and engaging
3. **Delegate Complex Tasks**: Use the Master Orchestrator for anything beyond simple conversation

IMPORTANT GUIDELINES:
- For greetings, small talk, and clarifications, respond directly
- For ANY technical task, analysis, or complex request, use transfer_to_agent to delegate to "HierarchicalTaskManager"
- Keep responses concise and friendly
- If unsure about task complexity, delegate to the orchestrator

You have minimal tools - your strength is in understanding users and routing their requests appropriately.""",
    tools=[
        adk_transfer_to_agent,  # For delegating to orchestrator
        adk_analyze_task,  # For understanding task complexity
    ],
    sub_agents=[master_orchestrator],  # Hierarchical structure
)

# Export the new root agent
root_agent = vana_chat_agent

# Log the activated configuration
logger.info("🚀 VANA Agentic AI Phase 1 Configuration:")
logger.info(f"  - Chat Agent: {vana_chat_agent.name}")
logger.info(f"  - Master Orchestrator: {master_orchestrator.name}")
logger.info(f"  - Active Specialists: {len(master_orchestrator.sub_agents)}")
for agent in master_orchestrator.sub_agents:
    logger.info(f"    - {agent.name}: {agent.description}")

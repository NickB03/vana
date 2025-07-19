"""
VANA Agent - ADK-Compliant Simplified Version

Following Google ADK best practices with minimal tools and simple instructions.
Based on research of ADK documentation and sample agents.
"""

import os
import sys

from dotenv import load_dotenv

# CRITICAL: Load environment variables BEFORE any Google libraries are imported.
# This ensures the GOOGLE_API_KEY is available for the ADK and GenAI clients.
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(project_root, ".env.local")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        print("✅ GOOGLE_API_KEY loaded from .env.local")
    else:
        print("❌ WARNING: GOOGLE_API_KEY not found in .env.local.")
else:
    # Fallback for environments where .env.local might not be present
    print(f"Warning: .env.local not found at {dotenv_path}. Relying on system environment variables.")

from google.adk.agents import LlmAgent

# Import only essential tools following ADK patterns
from lib._tools import adk_analyze_task  # Intelligent task analysis
# from lib._tools import adk_logical_analyze  # Logical reasoning tool - not available yet
# from lib._tools import adk_mathematical_solve  # Mathematical reasoning tool - not available yet
from lib._tools import adk_read_file  # Basic file operations
from lib._tools import adk_simple_execute_code  # Simple code execution
# ADK provides transfer_to_agent automatically - no need to import
from lib._tools import adk_write_file  # Basic file operations
# from lib._tools.web_search_sync import create_web_search_sync_tool  # Synchronous web search - not available yet
from lib.logging_config import get_logger

# Removed sys.path.insert - using proper package imports


# Import ADK memory service for persistent memory
try:
    from google.adk.tools import load_memory

    from lib._shared_libraries.adk_memory_service import get_adk_memory_service

    # Initialize memory service
    memory_service = get_adk_memory_service()
    MEMORY_AVAILABLE = memory_service.is_available()
    logger = get_logger("vana.agents.vana.team")
    logger.info(f"Memory service status: {'Available' if MEMORY_AVAILABLE else 'Not Available'}")
except ImportError as e:
    logger = get_logger("vana.agents.vana.team")
    logger.warning(f"Memory service not available: {e}")
    load_memory = None
    MEMORY_AVAILABLE = False

# Create synchronous web search tool
# adk_web_search = create_web_search_sync_tool()  # Web search not available yet

# Import enhanced orchestrator with specialists
try:
    from agents.vana.enhanced_orchestrator import enhanced_orchestrator

    # Use enhanced orchestrator as primary sub-agent
    specialist_agents = [enhanced_orchestrator]
    logger.info("✅ Enhanced orchestrator with specialists loaded")
except ImportError as e:
    logger.warning(f"Warning: Enhanced orchestrator not available, falling back to basic specialists: {e}")
    try:
        # Fallback to individual specialists
        from agents.data_science.specialist import data_science_specialist

        specialist_agents = [data_science_specialist]
    except ImportError:
        specialist_agents = []

# Import base agents module to avoid circular dependencies
from agents.base_agents import set_root_agent

# Create simplified ADK-compliant VANA agent following Google ADK best practices
root_agent = LlmAgent(
    name="vana",
    model=os.getenv("VANA_MODEL", "gemini-2.5-flash"),
    description="Intelligent AI assistant with core capabilities",
    instruction="""You are VANA, the conversational interface for a powerful multi-agent AI system.

Your ONLY role is to receive user requests and immediately transfer them to the enhanced_orchestrator.

CRITICAL TRANSFER RULE:
1. For EVERY user request, immediately call: transfer_to_agent(agent_name="enhanced_orchestrator")
2. Do NOT generate any response text - just call the transfer function
3. The enhanced_orchestrator will handle the response

DO NOT:
- Try to answer questions yourself
- Generate any text when transferring
- Explain that you're transferring
- Accept transfers FROM other agents (you are the entry point only)

JUST:
- Call transfer_to_agent(agent_name="enhanced_orchestrator") 
- Nothing else

You are the entry point, not a destination for transfers.""",
    tools=[
        # ADK provides transfer_to_agent automatically when sub_agents are present
    ],
    # Simple ADK delegation pattern
    sub_agents=specialist_agents,
)

# Register root agent to avoid circular dependencies
set_root_agent(root_agent)

"""
VANA Agent - ADK-Optimized Version
Following Google ADK best practices with simplified instructions and compliant tool definitions.
Based on analysis of ADK documentation, sample agents, and best practices.
"""

import os
from dotenv import load_dotenv

# Load environment variables
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
dotenv_path = os.path.join(project_root, ".env.local")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        print("✅ GOOGLE_API_KEY loaded from .env.local")

from google.adk.agents import LlmAgent

# Import ADK-compliant tools (no default parameters)
from lib._tools.optimized_adk_tools import (
    optimized_web_search,
    optimized_mathematical_solve,
    optimized_simple_execute_code,
    optimized_transfer_to_agent,
    optimized_analyze_task,
    optimized_read_file,
    optimized_write_file,
)

from lib.logging_config import get_logger

# Import memory service
try:
    from google.adk.tools import load_memory
    from lib._shared_libraries.adk_memory_service import get_adk_memory_service
    
    memory_service = get_adk_memory_service()
    MEMORY_AVAILABLE = memory_service.is_available()
    logger = get_logger("vana.agents.vana.team_optimized")
    logger.info(f"Memory service status: {'Available' if MEMORY_AVAILABLE else 'Not Available'}")
except ImportError as e:
    logger = get_logger("vana.agents.vana.team_optimized")
    logger.warning(f"Memory service not available: {e}")
    load_memory = None
    MEMORY_AVAILABLE = False

# Import enhanced orchestrator
try:
    from agents.vana.enhanced_orchestrator import enhanced_orchestrator
    specialist_agents = [enhanced_orchestrator]
    logger.info("✅ Enhanced orchestrator loaded")
except ImportError as e:
    logger.warning(f"Enhanced orchestrator not available: {e}")
    specialist_agents = []

# Import base agents module
from agents.base_agents import set_root_agent

# Create ADK-optimized VANA agent
optimized_root_agent = LlmAgent(
    name="vana_optimized",
    model=os.getenv("VANA_MODEL", "gemini-2.5-flash"),
    description="Intelligent AI assistant with optimized task routing and execution",
    instruction="""You are VANA, an intelligent AI assistant specializing in task routing and execution.

CORE CAPABILITIES:
- Analyze user requests and route to appropriate tools or specialists
- Execute calculations, simple code, and web searches directly
- Delegate complex analysis to specialized agents

APPROACH:
1. For current information (time, weather, news): Use web_search immediately
2. For calculations: Use mathematical_solve or simple_execute_code
3. For complex analysis: Use transfer_to_agent to delegate to specialists
4. For file operations: Use read_file or write_file as needed

ROUTING GUIDANCE:
- Route security queries to security specialist (priority)
- Route data analysis to data science specialist
- Route architecture questions to architecture specialist
- Route deployment questions to devops specialist

Be direct, accurate, and efficient. Choose the most appropriate tool for each task.""",
    tools=[
        optimized_web_search,
        optimized_mathematical_solve,
        optimized_simple_execute_code,
        optimized_transfer_to_agent,
        optimized_analyze_task,
        optimized_read_file,
        optimized_write_file,
    ] + ([load_memory] if MEMORY_AVAILABLE and load_memory else []),
    sub_agents=specialist_agents,
)

# Register optimized agent
set_root_agent(optimized_root_agent)
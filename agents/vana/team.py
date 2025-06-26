"""
VANA Agent - ADK-Compliant Simplified Version

Following Google ADK best practices with minimal tools and simple instructions.
Based on research of ADK documentation and sample agents.
"""

import os
import sys

from dotenv import load_dotenv
from google.adk.agents import LlmAgent

# Import only essential tools following ADK patterns
from lib._tools import adk_analyze_task  # Intelligent task analysis
from lib._tools import adk_logical_analyze  # Logical reasoning tool
from lib._tools import adk_mathematical_solve  # Mathematical reasoning tool
from lib._tools import adk_read_file  # Basic file operations
from lib._tools import adk_simple_execute_code  # Simple code execution
from lib._tools import adk_transfer_to_agent  # Agent delegation
from lib._tools import adk_web_search  # Current information
from lib._tools import adk_write_file  # Basic file operations
from lib._tools.search_coordinator import create_coordinated_search_tool  # Memory-first search
from lib.logging_config import get_logger

# Removed sys.path.insert - using proper package imports


# Load environment variables
load_dotenv()

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

# Initialize coordinated search tool
try:
    coordinated_search = create_coordinated_search_tool()
    COORDINATED_SEARCH_AVAILABLE = True
    logger.info("Coordinated search tool initialized successfully")
except Exception as e:
    logger.warning(f"Coordinated search tool not available: {e}")
    coordinated_search = None
    COORDINATED_SEARCH_AVAILABLE = False

# Import specialist agents for simple ADK delegation (following ADK patterns)
try:
    from agents.code_execution.specialist import code_execution_specialist
    from agents.data_science.specialist import data_science_specialist

    specialist_agents = [
        code_execution_specialist,
        data_science_specialist,
    ]
    logger.info("✅ Specialist agents imported for simple ADK delegation")
except ImportError as e:
    logger.warning(f"Warning: Specialist agents not available: {e}")
    specialist_agents = []

# Create simplified ADK-compliant VANA agent following Google ADK best practices
root_agent = LlmAgent(
    name="vana",
    model=os.getenv("VANA_MODEL", "gemini-2.0-flash-exp"),
    description="Intelligent AI assistant with core capabilities",
    instruction="""You are VANA, an intelligent AI assistant with automatic task routing.

AUTOMATIC ROUTING PROTOCOL - FOLLOW THIS FOR EVERY USER REQUEST:
1. First, use analyze_task to classify the user's request
2. If the task_type is "code_execution", immediately use transfer_to_agent with agent_name="code_execution_specialist"
3. If the task_type is "data_analysis", immediately use transfer_to_agent with agent_name="data_science_specialist"
4. For all other task types, handle the request directly using the appropriate tools below

AVAILABLE TOOLS:
- coordinated_search: 🔍 ALWAYS USE THIS FOR ANY INFORMATION QUERIES - automatically checks memory → vector → web in optimal order
- mathematical_solve: For mathematical problems and calculations
- logical_analyze: For logical reasoning tasks
- read_file/write_file: For file operations
- simple_execute_code: For basic Python execution (only for simple tasks, not complex code)
- load_memory: For direct memory queries (prefer coordinated_search for general information)
- web_search: For direct web queries (prefer coordinated_search for comprehensive results)

SEARCH STRATEGY:
ALWAYS use coordinated_search for information queries instead of individual search tools:
- "What is VANA?" → coordinated_search (checks memory + knowledge first)
- "How do I do X?" → coordinated_search (checks stored solutions first)
- "Current weather" → coordinated_search (intelligently routes to web for current data)
- "User preferences" → coordinated_search (prioritizes memory for personal context)

Remember: Always analyze first, then route if needed, then execute.""",
    tools=[
        # Memory-first coordinated search (highest priority)
        coordinated_search,  # Intelligent search with memory → vector → web priority
        # Essential tools (following ADK best practices)
        adk_mathematical_solve,  # Math problems
        adk_logical_analyze,  # Logical reasoning
        adk_read_file,  # Basic file operations
        adk_write_file,  # Basic file operations
        adk_analyze_task,  # Intelligent task analysis
        adk_transfer_to_agent,  # Agent delegation for automatic routing
        adk_simple_execute_code,  # Simple code execution
        # Legacy tools (lower priority - prefer coordinated_search)
        adk_web_search,  # Direct web search (use coordinated_search instead)
    ]
    + ([load_memory] if MEMORY_AVAILABLE and load_memory else [])  # Direct memory (use coordinated_search instead)
    if COORDINATED_SEARCH_AVAILABLE else [
        # Fallback to original tools if coordinated search unavailable
        adk_web_search,  # Current information
        adk_mathematical_solve,  # Math problems
        adk_logical_analyze,  # Logical reasoning
        adk_read_file,  # Basic file operations
        adk_write_file,  # Basic file operations
        adk_analyze_task,  # Intelligent task analysis
        adk_transfer_to_agent,  # Agent delegation for automatic routing
        adk_simple_execute_code,  # Simple code execution
    ] + ([load_memory] if MEMORY_AVAILABLE and load_memory else []),
    # Simple ADK delegation pattern
    sub_agents=specialist_agents,
)

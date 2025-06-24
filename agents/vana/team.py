"""
VANA Agent - ADK-Compliant Simplified Version

Following Google ADK best practices with minimal tools and simple instructions.
Based on research of ADK documentation and sample agents.
"""

import os

from dotenv import load_dotenv
from google.adk.agents import LlmAgent

# Import only essential tools following ADK patterns
from lib._tools import adk_analyze_task  # Intelligent task analysis
from lib._tools import adk_logical_analyze  # Logical reasoning tool
from lib._tools import adk_mathematical_solve  # Mathematical reasoning tool
from lib._tools import adk_read_file  # Basic file operations
from lib._tools import adk_simple_execute_code  # Simple code execution
from lib._tools import adk_web_search  # Current information
from lib._tools import adk_write_file  # Basic file operations
from lib.logging_config import get_logger

# Load environment variables
load_dotenv()

# Logging configuration

logger = get_logger("vana.agents.vana.team")

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
    instruction="""You are VANA, an intelligent AI assistant.
Use web_search for current information, mathematical_solve for math problems,
logical_analyze for reasoning tasks, file tools for basic file operations,
simple_execute_code for basic Python execution, and analyze_task for intelligent task analysis.
Delegate complex code tasks to code_execution agent and data tasks to data_science agent.""",
    tools=[
        # Essential tools only (following ADK best practices)
        adk_web_search,  # Current information
        adk_mathematical_solve,  # Math problems
        adk_logical_analyze,  # Logical reasoning
        adk_read_file,  # Basic file operations
        adk_write_file,  # Basic file operations
        adk_analyze_task,  # Intelligent task analysis
        adk_simple_execute_code,  # Simple code execution
    ],
    # Simple ADK delegation pattern
    sub_agents=specialist_agents,
)

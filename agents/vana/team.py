"""
VANA Agent - Phase 2.1: Echo Tool Testing

Testing incremental tool restoration starting with echo tool.
"""

from google.adk.agents import LlmAgent
from lib._tools import (
    adk_echo, adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    adk_vector_search, adk_web_search, adk_search_knowledge,
    adk_get_health_status, adk_coordinate_task,
    adk_ask_for_approval, adk_generate_report
)

# Create VANA agent with working tools
# NOTE: Agent tools (adk_architecture_tool, adk_ui_tool, adk_devops_tool, adk_qa_tool)
# are TEMPORARILY DISABLED due to import/implementation issues causing hangs.
# These need to be fixed in Phase 4: Agent Tools Implementation
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    instruction="You are VANA, an AI assistant. You can help with general questions and conversations. You have access to echo, file operation, search, system, and advanced tools for testing purposes.",
    tools=[
        adk_echo, adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_get_health_status, adk_coordinate_task,
        adk_ask_for_approval, adk_generate_report
        # TODO Phase 4: Re-enable agent tools after fixing implementation issues:
        # adk_architecture_tool, adk_ui_tool, adk_devops_tool, adk_qa_tool
    ]  # Phase 2: Working tools (14 total) - Agent tools deferred to Phase 4
)

"""
VANA Agent - Phase 4 COMPLETE: All Tools Operational

All 16 tools now working including agent tools with singleton pattern fix.
"""

from google.adk.agents import LlmAgent
from lib._tools import (
    adk_echo, adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    adk_vector_search, adk_web_search, adk_search_knowledge,
    adk_get_health_status, adk_coordinate_task,
    adk_ask_for_approval, adk_generate_report,
    adk_architecture_tool, adk_ui_tool, adk_devops_tool, adk_qa_tool
)

# Create VANA agent with ALL tools including agent tools
# Phase 4 COMPLETE: Agent tools now working with singleton pattern fix
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    instruction="You are VANA, an AI assistant with comprehensive capabilities. You can help with general questions, file operations, search, system tasks, and specialized agent tools for architecture, UI, DevOps, and QA tasks.",
    tools=[
        adk_echo, adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        adk_vector_search, adk_web_search, adk_search_knowledge,
        adk_get_health_status, adk_coordinate_task,
        adk_ask_for_approval, adk_generate_report,
        adk_architecture_tool, adk_ui_tool, adk_devops_tool, adk_qa_tool
    ]  # Phase 4 COMPLETE: All 16 tools operational (12 base + 4 agent tools)
)

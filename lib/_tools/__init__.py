# Core ADK Tools - Production Ready Tools for VANA Multi-Agent System

# Import available tools from adk_tools.py
from .adk_tools import (
    # File System Tools
    adk_read_file,
    adk_write_file,
    adk_list_directory,
    adk_file_exists,
    # Search Tools
    adk_vector_search,
    adk_web_search,
    adk_search_knowledge,
    # System Tools
    adk_echo,
    adk_get_health_status,
    # Agent Coordination Tools
    adk_coordinate_task,
    adk_delegate_to_agent,
    adk_get_agent_status,
    adk_transfer_to_agent,
    # Task Analysis Tools
    adk_analyze_task,
    adk_match_capabilities,
    adk_classify_task,
    # Workflow Management Tools
    adk_create_workflow,
    adk_start_workflow,
    adk_get_workflow_status,
    adk_list_workflows,
    adk_pause_workflow,
    adk_resume_workflow,
    adk_cancel_workflow,
    adk_get_workflow_templates,
    # Enhanced Tools
    adk_intelligent_echo,
    adk_enhanced_analyze_task,
    adk_reasoning_coordinate_task,
    adk_mathematical_solve,
    adk_logical_analyze,
    adk_simple_execute_code,
)

# Import agent tools
from .agent_tools import (
    create_agent_tool,
    create_specialist_tools,
    get_adk_architecture_tool,
    get_adk_ui_tool,
    get_adk_devops_tool,
    get_adk_qa_tool,
)

# Import coordination tools
from .real_coordination_tools import (
    real_coordinate_task,
    real_delegate_to_agent,
    transfer_to_agent,
)

# Import task analyzer
from .task_analyzer import TaskAnalyzer

# Import registry
from .registry import ToolRegistry

# Export all tools for easy import
__all__ = [
    # File System Tools
    "adk_read_file",
    "adk_write_file",
    "adk_list_directory",
    "adk_file_exists",
    # Search Tools
    "adk_vector_search",
    "adk_web_search",
    "adk_search_knowledge",
    # System Tools
    "adk_echo",
    "adk_get_health_status",
    # Agent Coordination Tools
    "adk_coordinate_task",
    "adk_delegate_to_agent",
    "adk_get_agent_status",
    "adk_transfer_to_agent",
    "real_coordinate_task",
    "real_delegate_to_agent",
    # Task Analysis Tools
    "adk_analyze_task",
    "adk_match_capabilities",
    "adk_classify_task",
    "TaskAnalyzer",
    # Workflow Management Tools
    "adk_create_workflow",
    "adk_start_workflow",
    "adk_get_workflow_status",
    "adk_list_workflows",
    "adk_pause_workflow",
    "adk_resume_workflow",
    "adk_cancel_workflow",
    "adk_get_workflow_templates",
    # Enhanced Tools
    "adk_intelligent_echo",
    "adk_enhanced_analyze_task",
    "adk_reasoning_coordinate_task",
    "adk_mathematical_solve",
    "adk_logical_analyze",
    "adk_simple_execute_code",
    # Agent Tools
    "create_agent_tool",
    "create_specialist_tools",
    "get_adk_architecture_tool",
    "get_adk_ui_tool",
    "get_adk_devops_tool",
    "get_adk_qa_tool",
    # Registry
    "ToolRegistry",
]
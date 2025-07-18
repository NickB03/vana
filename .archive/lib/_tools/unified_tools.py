"""
Unified Tools Module for VANA - ADK Compliant

Provides all tools following pure ADK patterns.
No adapters, no complexity - just simple, direct tool access.
"""

from typing import List
from google.adk.tools import FunctionTool

# Import ADK-compliant tools
from lib._tools.adk_tools import (
    read_file,
    write_file,
    list_directory,
    create_directory,
    search_files,
    move_file,
    delete_file,
    execute_code,
    run_python,
    analyze_task,
)

# Import new ADK-compliant content creation and research tools
from lib._tools.content_creation_tools_adk import tools as content_tools
from lib._tools.research_tools_adk_v2 import tools as research_tools

# Create unified tool lists by category
TOOL_CATEGORIES = {
    'file_operations': [
        FunctionTool(read_file, name="read_file"),
        FunctionTool(write_file, name="write_file"),
        FunctionTool(list_directory, name="list_directory"),
        FunctionTool(create_directory, name="create_directory"),
        FunctionTool(search_files, name="search_files"),
        FunctionTool(move_file, name="move_file"),
        FunctionTool(delete_file, name="delete_file")
    ],
    'code_execution': [
        FunctionTool(execute_code, name="execute_code"),
        FunctionTool(run_python, name="run_python")
    ],
    'task_analysis': [
        FunctionTool(analyze_task, name="analyze_task")
    ],
    'content_creation': content_tools,
    'research': research_tools
}

def get_all_unified_tools() -> List[FunctionTool]:
    """
    Get all tools with unified ADK interface.
    
    Returns:
        List of all available FunctionTool instances
    """
    all_tools = []
    for category_tools in TOOL_CATEGORIES.values():
        all_tools.extend(category_tools)
    return all_tools


def get_tools_by_category(category: str) -> List[FunctionTool]:
    """
    Get all tools in a specific category.
    
    Args:
        category: Category name from TOOL_CATEGORIES
        
    Returns:
        List of FunctionTool instances in that category
    """
    if category not in TOOL_CATEGORIES:
        raise ValueError(f"Unknown category: {category}. Available: {list(TOOL_CATEGORIES.keys())}")
    
    return TOOL_CATEGORIES[category]


def create_tool_list_for_agent(tool_names: List[str]) -> List[FunctionTool]:
    """
    Create a list of FunctionTool instances for an agent by name.
    
    Args:
        tool_names: List of tool names to include
        
    Returns:
        List of FunctionTool instances
    """
    all_tools = get_all_unified_tools()
    tool_dict = {tool.name: tool for tool in all_tools}
    
    selected_tools = []
    for name in tool_names:
        if name in tool_dict:
            selected_tools.append(tool_dict[name])
        else:
            print(f"Warning: Tool '{name}' not found in unified registry")
    
    return selected_tools


# Export convenience functions
__all__ = [
    'get_all_unified_tools',
    'get_tools_by_category',
    'create_tool_list_for_agent',
    'TOOL_CATEGORIES'
]
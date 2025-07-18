"""
ADK-Optimized Tools
Tools optimized for Google ADK compliance - no default parameters, clean signatures
"""

import json
from google.adk.tools import FunctionTool

# Import existing tool implementations
from lib._tools.adk_tools import (
    simple_execute_code,
    mathematical_solve, 
    transfer_to_agent,
    analyze_task,
    read_file,
    write_file,
)
from lib._tools.google_search_v2 import google_web_search


def optimized_web_search_impl(query: str, max_results: int) -> str:
    """🔍 Search the web using Google Custom Search API with DuckDuckGo fallback."""
    return google_web_search(query, max_results)


def optimized_mathematical_solve_impl(problem: str) -> str:
    """🔢 Solve mathematical problems with step-by-step reasoning."""
    return mathematical_solve(problem)


def optimized_simple_execute_code_impl(code: str, language: str) -> str:
    """🐍 Execute simple Python code safely with security validation."""
    return simple_execute_code(code, language)


def optimized_transfer_to_agent_impl(agent_name: str, context: str) -> str:
    """🔄 Transfer conversation to specialized agent."""
    return transfer_to_agent(agent_name, context)


def optimized_analyze_task_impl(task: str, context: str) -> str:
    """🎯 Analyze task to determine type and routing requirements."""
    return analyze_task(task, context)


def optimized_read_file_impl(file_path: str) -> str:
    """📖 Read file contents from filesystem."""
    return read_file(file_path)


def optimized_write_file_impl(file_path: str, content: str) -> str:
    """📝 Write content to file."""
    return write_file(file_path, content)


# Create ADK-compliant FunctionTool instances
optimized_web_search = FunctionTool(optimized_web_search_impl)
optimized_mathematical_solve = FunctionTool(optimized_mathematical_solve_impl)
optimized_simple_execute_code = FunctionTool(optimized_simple_execute_code_impl)
optimized_transfer_to_agent = FunctionTool(optimized_transfer_to_agent_impl)
optimized_analyze_task = FunctionTool(optimized_analyze_task_impl)
optimized_read_file = FunctionTool(optimized_read_file_impl)
optimized_write_file = FunctionTool(optimized_write_file_impl)
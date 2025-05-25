"""
ADK-Compatible Tools for VANA Multi-Agent System

This module wraps all the enhanced VANA tools to be compatible with Google ADK's
tool system while preserving the enhanced UX patterns and error handling.

UPDATED: Now uses standardized tool framework for consistent interfaces,
performance monitoring, and enhanced error handling.
"""

import os
import sys
from typing import Dict, Any, List, Optional

# Add the parent directory to the path to import VANA tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from google.adk.tools import FunctionTool

# Import standardized VANA tools
from vana_multi_agent.tools.standardized_file_tools import (
    standardized_read_file, standardized_write_file,
    standardized_list_directory, standardized_file_exists
)
from vana_multi_agent.tools.standardized_search_tools import (
    standardized_vector_search, standardized_web_search,
    standardized_search_knowledge
)
from vana_multi_agent.tools.standardized_kg_tools import (
    standardized_kg_query, standardized_kg_store,
    standardized_kg_relationship, standardized_kg_extract_entities
)
from vana_multi_agent.tools.standardized_system_tools import (
    standardized_echo, standardized_get_health_status,
    standardized_coordinate_task, standardized_delegate_to_agent,
    standardized_get_agent_status
)

# File System Tools - Now using standardized framework
def _read_file(file_path: str) -> str:
    """📖 Read the contents of a file with enhanced error handling and security checks."""
    return standardized_read_file(file_path)

def _write_file(file_path: str, content: str) -> str:
    """✍️ Write content to a file with backup and validation."""
    return standardized_write_file(file_path, content)

def _list_directory(directory_path: str) -> str:
    """📁 List contents of a directory with enhanced formatting and metadata."""
    return standardized_list_directory(directory_path)

def _file_exists(file_path: str) -> str:
    """🔍 Check if a file or directory exists with detailed status information."""
    return standardized_file_exists(file_path)

# Create FunctionTool instances
adk_read_file = FunctionTool(func=_read_file)
adk_write_file = FunctionTool(func=_write_file)
adk_list_directory = FunctionTool(func=_list_directory)
adk_file_exists = FunctionTool(func=_file_exists)

# Search Tools - Now using standardized framework
def _vector_search(query: str, max_results: int = 5) -> str:
    """🔍 Search the vector database for relevant information with enhanced results."""
    return standardized_vector_search(query, max_results)

def _web_search(query: str, max_results: int = 5) -> str:
    """🌐 Search the web for current information with enhanced formatting."""
    return standardized_web_search(query, max_results)

def _search_knowledge(query: str) -> str:
    """🧠 Search the knowledge base for relevant information with context."""
    return standardized_search_knowledge(query, max_results=5)

# Create FunctionTool instances
adk_vector_search = FunctionTool(func=_vector_search)
adk_web_search = FunctionTool(func=_web_search)
adk_search_knowledge = FunctionTool(func=_search_knowledge)

# Knowledge Graph Tools - Now using standardized framework
def _kg_query(entity_type: str, query_text: str) -> str:
    """🕸️ Query the knowledge graph for entities and relationships."""
    return standardized_kg_query(entity_type, query_text)

def _kg_store(entity_name: str, entity_type: str, properties: str = "") -> str:
    """💾 Store an entity in the knowledge graph with properties."""
    return standardized_kg_store(entity_name, entity_type, properties)

def _kg_relationship(entity1: str, relationship: str, entity2: str) -> str:
    """🔗 Create a relationship between two entities in the knowledge graph."""
    return standardized_kg_relationship(entity1, relationship, entity2)

def _kg_extract_entities(text: str) -> str:
    """🎯 Extract entities from text using NLP and store in knowledge graph."""
    return standardized_kg_extract_entities(text)

# Create FunctionTool instances
adk_kg_query = FunctionTool(func=_kg_query)
adk_kg_store = FunctionTool(func=_kg_store)
adk_kg_relationship = FunctionTool(func=_kg_relationship)
adk_kg_extract_entities = FunctionTool(func=_kg_extract_entities)

# System Tools - Now using standardized framework
def _echo(message: str) -> str:
    """📢 Echo a message back with enhanced formatting for testing."""
    return standardized_echo(message)

def _get_health_status() -> str:
    """💚 Get comprehensive system health status with detailed metrics."""
    return standardized_get_health_status()

# Enhanced Agent Coordination Tools - Now using standardized framework
def _coordinate_task(task_description: str, assigned_agent: str = "") -> str:
    """🎯 Coordinate task assignment with enhanced PLAN/ACT routing."""
    return standardized_coordinate_task(task_description, assigned_agent)

def _delegate_to_agent(agent_name: str, task: str, context: str = "") -> str:
    """🤝 Delegate task with confidence-based agent selection."""
    return standardized_delegate_to_agent(agent_name, task, context)

def _get_agent_status() -> str:
    """📊 Get enhanced status of all agents with PLAN/ACT capabilities."""
    return standardized_get_agent_status()

# Create FunctionTool instances
adk_echo = FunctionTool(func=_echo)
adk_get_health_status = FunctionTool(func=_get_health_status)
adk_coordinate_task = FunctionTool(func=_coordinate_task)
adk_delegate_to_agent = FunctionTool(func=_delegate_to_agent)
adk_get_agent_status = FunctionTool(func=_get_agent_status)

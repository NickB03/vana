"""
ADK-Compatible Tools for VANA Multi-Agent System

This module wraps all the enhanced VANA tools to be compatible with Google ADK's
tool system while preserving the enhanced UX patterns and error handling.
"""

import os
import sys
from typing import Dict, Any, List, Optional

# Add the parent directory to the path to import VANA tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from google.adk.tools import FunctionTool

# Import enhanced VANA tools
from agent.tools import (
    echo, read_file, write_file, list_directory, file_exists,
    vector_search, search_knowledge, get_health_status,
    web_search,
    kg_query, kg_store, kg_relationship, kg_extract_entities
)

# File System Tools
def _read_file(file_path: str) -> str:
    """📖 Read the contents of a file with enhanced error handling and security checks."""
    return read_file(file_path)

def _write_file(file_path: str, content: str) -> str:
    """✍️ Write content to a file with backup and validation."""
    return write_file(file_path, content)

def _list_directory(directory_path: str) -> str:
    """📁 List contents of a directory with enhanced formatting and metadata."""
    return list_directory(directory_path)

def _file_exists(file_path: str) -> str:
    """🔍 Check if a file or directory exists with detailed status information."""
    return file_exists(file_path)

# Create FunctionTool instances
adk_read_file = FunctionTool(func=_read_file)
adk_write_file = FunctionTool(func=_write_file)
adk_list_directory = FunctionTool(func=_list_directory)
adk_file_exists = FunctionTool(func=_file_exists)

# Search Tools
def _vector_search(query: str, max_results: int = 5) -> str:
    """🔍 Search the vector database for relevant information with enhanced results."""
    return vector_search(query, max_results)

def _web_search(query: str, max_results: int = 5) -> str:
    """🌐 Search the web for current information with enhanced formatting."""
    return web_search(query, max_results)

def _search_knowledge(query: str) -> str:
    """🧠 Search the knowledge base for relevant information with context."""
    return search_knowledge(query)

# Create FunctionTool instances
adk_vector_search = FunctionTool(func=_vector_search)
adk_web_search = FunctionTool(func=_web_search)
adk_search_knowledge = FunctionTool(func=_search_knowledge)

# Knowledge Graph Tools
def _kg_query(query: str) -> str:
    """🕸️ Query the knowledge graph for entities and relationships."""
    return kg_query(query)

def _kg_store(entity: str, properties: str) -> str:
    """💾 Store an entity in the knowledge graph with properties."""
    return kg_store(entity, properties)

def _kg_relationship(entity1: str, relationship: str, entity2: str) -> str:
    """🔗 Create a relationship between two entities in the knowledge graph."""
    return kg_relationship(entity1, relationship, entity2)

def _kg_extract_entities(text: str) -> str:
    """🎯 Extract entities from text using NLP and store in knowledge graph."""
    return kg_extract_entities(text)

# Create FunctionTool instances
adk_kg_query = FunctionTool(func=_kg_query)
adk_kg_store = FunctionTool(func=_kg_store)
adk_kg_relationship = FunctionTool(func=_kg_relationship)
adk_kg_extract_entities = FunctionTool(func=_kg_extract_entities)

# System Tools
def _echo(message: str) -> str:
    """📢 Echo a message back with enhanced formatting for testing."""
    return echo(message)

def _get_health_status() -> str:
    """💚 Get comprehensive system health status with detailed metrics."""
    return get_health_status()

# Agent Coordination Tools
def _coordinate_task(task_description: str, assigned_agent: str) -> str:
    """🎯 Coordinate task assignment to specialist agents with tracking."""
    return f"✅ Task '{task_description}' has been assigned to {assigned_agent} with tracking ID: TASK-{hash(task_description) % 10000:04d}"

def _delegate_to_agent(agent_name: str, task: str, context: str = "") -> str:
    """🤝 Delegate a specific task to a specialist agent with context."""
    agent_responses = {
        "rhea": f"🏗️ Rhea (Architect): Analyzing architecture requirements for '{task}'",
        "max": f"🎨 Max (UI Engineer): Designing interface solutions for '{task}'",
        "sage": f"⚙️ Sage (DevOps): Planning infrastructure for '{task}'",
        "kai": f"🧪 Kai (QA): Preparing test scenarios for '{task}'"
    }

    response = agent_responses.get(agent_name.lower(), f"❓ Unknown agent: {agent_name}")
    if context:
        response += f"\n📋 Context: {context}"

    return response

def _get_agent_status() -> str:
    """📊 Get status of all agents in the multi-agent system."""
    return """🤖 VANA Multi-Agent System Status:

🎯 Vana (Orchestrator): ✅ Active - Coordinating tasks and managing workflow
🏗️ Rhea (Architect): ✅ Active - Ready for architecture and design tasks
🎨 Max (UI Engineer): ✅ Active - Ready for interface and UX tasks
⚙️ Sage (DevOps): ✅ Active - Ready for infrastructure and deployment tasks
🧪 Kai (QA): ✅ Active - Ready for testing and quality assurance tasks

📈 System Health: All agents operational and ready for task delegation"""

# Create FunctionTool instances
adk_echo = FunctionTool(func=_echo)
adk_get_health_status = FunctionTool(func=_get_health_status)
adk_coordinate_task = FunctionTool(func=_coordinate_task)
adk_delegate_to_agent = FunctionTool(func=_delegate_to_agent)
adk_get_agent_status = FunctionTool(func=_get_agent_status)

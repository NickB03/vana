"""
Persistent Memory Tools for VANA

This module provides tools for the VANA agent to interact with the persistent memory system.
"""

import logging
from typing import List
from google.adk.tools import FunctionTool
from .persistent_memory import get_persistent_memory

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

async def search_persistent_memory(query: str, top_k: int = 5) -> str:
    """
    Search the persistent memory for relevant information.
    
    Args:
        query: The search query
        top_k: Maximum number of results to return (default: 5)
        
    Returns:
        Formatted string with search results
    """
    try:
        # Get the persistent memory instance
        memory = get_persistent_memory()
        
        # Search the memory
        results = await memory.search_memory(query, top_k=top_k)
        
        return results
    except Exception as e:
        logger.error(f"Error searching persistent memory: {e}")
        return f"Error searching persistent memory: {str(e)}"

def store_entity_in_memory(entity_name: str, entity_type: str, observations: List[str]) -> str:
    """
    Store an entity in the persistent memory.
    
    Args:
        entity_name: Name of the entity
        entity_type: Type of the entity
        observations: List of observations about the entity
        
    Returns:
        Status message
    """
    try:
        # Get the persistent memory instance
        memory = get_persistent_memory()
        
        # Store the entity
        result = memory.store_entity(entity_name, entity_type, observations)
        
        return result
    except Exception as e:
        logger.error(f"Error storing entity in persistent memory: {e}")
        return f"Error storing entity in persistent memory: {str(e)}"

def create_relationship_in_memory(from_entity: str, relationship: str, to_entity: str) -> str:
    """
    Create a relationship between entities in the persistent memory.
    
    Args:
        from_entity: Name of the source entity
        relationship: Type of relationship
        to_entity: Name of the target entity
        
    Returns:
        Status message
    """
    try:
        # Get the persistent memory instance
        memory = get_persistent_memory()
        
        # Create the relationship
        result = memory.create_relationship(from_entity, relationship, to_entity)
        
        return result
    except Exception as e:
        logger.error(f"Error creating relationship in persistent memory: {e}")
        return f"Error creating relationship in persistent memory: {str(e)}"

# Create function tools
search_persistent_memory_tool = FunctionTool(func=search_persistent_memory)
store_entity_tool = FunctionTool(func=store_entity_in_memory)
create_relationship_tool = FunctionTool(func=create_relationship_in_memory)

"""
ADK Memory Tool - Cross-Session Memory Storage

This tool provides functions for saving and retrieving memories using ADK's 
state management with the user: prefix for cross-session persistence.

Follows ADK patterns for tool implementation with ToolContext parameter.
"""

from typing import Dict, Any, List, Optional
from google.adk.tools import ToolContext
from lib.logging_config import get_logger
from lib._tools.memory_detection_patterns import DetectedMemory, MemoryType
from datetime import datetime

logger = get_logger("vana.adk_memory_tool")


def save_user_memory(
    key: str, 
    value: Any, 
    context: Optional[str] = None,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Save a memory item to user state for cross-session persistence.
    
    This function saves data with the 'user:' prefix, which persists across
    sessions when using VertexAiSessionService or other persistent backends.
    
    Args:
        key: The memory key (e.g., "name", "favorite_color")
        value: The value to remember
        context: Optional context about the memory
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with status and saved information
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        # Use user: prefix for cross-session persistence
        state_key = f"user:{key}"
        
        # Save the primary value
        tool_context.state[state_key] = value
        
        # Save metadata if context provided
        if context:
            meta_key = f"user:_meta:{key}"
            tool_context.state[meta_key] = {
                "context": context,
                "saved_at": datetime.utcnow().isoformat(),
                "type": "manual"
            }
        
        logger.info(f"Saved memory: {state_key} = {value}")
        
        return {
            "status": "success",
            "key": key,
            "value": value,
            "state_key": state_key,
            "context": context
        }
        
    except Exception as e:
        logger.error(f"Failed to save memory: {e}")
        return {"error": f"Failed to save memory: {str(e)}"}


def save_detected_memory(
    memory: DetectedMemory,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Save a memory detected by the memory detection patterns.
    
    Args:
        memory: DetectedMemory object from detection patterns
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with status and saved information
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        # Use user: prefix for cross-session persistence
        state_key = f"user:{memory.key}"
        
        # Handle special cases for lists (likes, dislikes, goals)
        if memory.key in ["likes", "dislikes", "goal", "context"]:
            # Get existing list or create new
            existing = tool_context.state.get(state_key, [])
            if not isinstance(existing, list):
                existing = [existing] if existing else []
            
            # Add new value if not already present
            if memory.value not in existing:
                existing.append(memory.value)
                tool_context.state[state_key] = existing
                value_saved = existing
            else:
                value_saved = existing
        else:
            # Single value memories (name, location, etc.)
            tool_context.state[state_key] = memory.value
            value_saved = memory.value
        
        # Save metadata
        meta_key = f"user:_meta:{memory.key}"
        existing_meta = tool_context.state.get(meta_key, {})
        
        # Update metadata
        tool_context.state[meta_key] = {
            "context": memory.context,
            "saved_at": datetime.utcnow().isoformat(),
            "type": memory.memory_type.value,
            "importance": memory.importance_score,
            "confidence": memory.confidence,
            "last_updated": datetime.utcnow().isoformat(),
            "update_count": existing_meta.get("update_count", 0) + 1
        }
        
        logger.info(f"Saved detected memory: {state_key} = {value_saved}")
        
        return {
            "status": "success",
            "key": memory.key,
            "value": value_saved,
            "state_key": state_key,
            "memory_type": memory.memory_type.value,
            "importance": memory.importance_score
        }
        
    except Exception as e:
        logger.error(f"Failed to save detected memory: {e}")
        return {"error": f"Failed to save detected memory: {str(e)}"}


def retrieve_user_memory(
    key: str,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Retrieve a specific memory from user state.
    
    Args:
        key: The memory key to retrieve
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with the memory value and metadata if found
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        state_key = f"user:{key}"
        value = tool_context.state.get(state_key)
        
        if value is None:
            return {
                "status": "not_found",
                "key": key,
                "message": f"No memory found for key: {key}"
            }
        
        # Get metadata if available
        meta_key = f"user:_meta:{key}"
        metadata = tool_context.state.get(meta_key, {})
        
        return {
            "status": "success",
            "key": key,
            "value": value,
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"Failed to retrieve memory: {e}")
        return {"error": f"Failed to retrieve memory: {str(e)}"}


def search_user_memories(
    query: str,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Search for memories containing the query string.
    
    This is a basic string search. For semantic search, use Chunk 1.5.
    
    Args:
        query: Search query string
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with list of matching memories
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        query_lower = query.lower()
        matches = []
        
        # Search through all user: prefixed state
        for key, value in tool_context.state.items():
            if key.startswith("user:") and not key.startswith("user:_meta:"):
                # Skip metadata keys
                clean_key = key[5:]  # Remove 'user:' prefix
                
                # Check if query matches key or value
                key_match = query_lower in clean_key.lower()
                value_match = False
                
                if isinstance(value, str):
                    value_match = query_lower in value.lower()
                elif isinstance(value, list):
                    value_match = any(query_lower in str(v).lower() for v in value)
                
                if key_match or value_match:
                    # Get metadata
                    meta_key = f"user:_meta:{clean_key}"
                    metadata = tool_context.state.get(meta_key, {})
                    
                    matches.append({
                        "key": clean_key,
                        "value": value,
                        "metadata": metadata,
                        "match_type": "key" if key_match else "value"
                    })
        
        return {
            "status": "success",
            "query": query,
            "count": len(matches),
            "matches": matches
        }
        
    except Exception as e:
        logger.error(f"Failed to search memories: {e}")
        return {"error": f"Failed to search memories: {str(e)}"}


def list_all_user_memories(
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    List all stored user memories.
    
    Args:
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with all user memories organized by type
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        memories = {
            "identity": {},
            "preferences": {},
            "goals": [],
            "context": [],
            "other": {}
        }
        
        # Collect all user: prefixed state
        for key, value in tool_context.state.items():
            if key.startswith("user:") and not key.startswith("user:_meta:"):
                clean_key = key[5:]  # Remove 'user:' prefix
                
                # Categorize memories
                if clean_key in ["name", "occupation", "location"]:
                    memories["identity"][clean_key] = value
                elif clean_key in ["likes", "dislikes"] or clean_key.startswith("favorite_"):
                    memories["preferences"][clean_key] = value
                elif clean_key == "goal":
                    memories["goals"] = value if isinstance(value, list) else [value]
                elif clean_key == "context":
                    memories["context"] = value if isinstance(value, list) else [value]
                else:
                    memories["other"][clean_key] = value
        
        # Count total memories
        total_count = (
            len(memories["identity"]) + 
            len(memories["preferences"]) + 
            len(memories["goals"]) + 
            len(memories["context"]) + 
            len(memories["other"])
        )
        
        return {
            "status": "success",
            "total_count": total_count,
            "memories": memories
        }
        
    except Exception as e:
        logger.error(f"Failed to list memories: {e}")
        return {"error": f"Failed to list memories: {str(e)}"}


def clear_user_memory(
    key: str,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Clear a specific memory.
    
    Args:
        key: The memory key to clear
        tool_context: ADK ToolContext for state access
        
    Returns:
        Dict with status of the operation
    """
    if not tool_context:
        return {"error": "ToolContext is required for memory operations"}
    
    try:
        state_key = f"user:{key}"
        meta_key = f"user:_meta:{key}"
        
        # Check if memory exists
        if state_key not in tool_context.state:
            return {
                "status": "not_found",
                "key": key,
                "message": f"No memory found for key: {key}"
            }
        
        # Clear the memory and its metadata
        del tool_context.state[state_key]
        if meta_key in tool_context.state:
            del tool_context.state[meta_key]
        
        logger.info(f"Cleared memory: {state_key}")
        
        return {
            "status": "success",
            "key": key,
            "message": f"Memory '{key}' cleared successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to clear memory: {e}")
        return {"error": f"Failed to clear memory: {str(e)}"}


# Helper function for agents to get user context
def get_user_context_summary(tool_context: ToolContext = None) -> str:
    """
    Get a human-readable summary of user context for agent instructions.
    
    Args:
        tool_context: ADK ToolContext for state access
        
    Returns:
        String summary of user information
    """
    if not tool_context:
        return "No user context available."
    
    try:
        all_memories = list_all_user_memories(tool_context)
        if all_memories.get("status") != "success":
            return "Unable to retrieve user context."
        
        memories = all_memories.get("memories", {})
        summary_parts = []
        
        # Identity information
        identity = memories.get("identity", {})
        if identity.get("name"):
            summary_parts.append(f"User's name is {identity['name']}")
        if identity.get("occupation"):
            summary_parts.append(f"They work as {identity['occupation']}")
        if identity.get("location"):
            summary_parts.append(f"They are located in {identity['location']}")
        
        # Preferences
        prefs = memories.get("preferences", {})
        if prefs.get("likes"):
            likes = prefs["likes"] if isinstance(prefs["likes"], list) else [prefs["likes"]]
            summary_parts.append(f"They like: {', '.join(likes)}")
        if prefs.get("dislikes"):
            dislikes = prefs["dislikes"] if isinstance(prefs["dislikes"], list) else [prefs["dislikes"]]
            summary_parts.append(f"They dislike: {', '.join(dislikes)}")
        
        # Goals
        goals = memories.get("goals", [])
        if goals:
            summary_parts.append(f"Their goals include: {', '.join(goals)}")
        
        if not summary_parts:
            return "No specific user information available yet."
        
        return "User Context: " + ". ".join(summary_parts) + "."
        
    except Exception as e:
        logger.error(f"Failed to generate user context summary: {e}")
        return "Error retrieving user context."


# Export all memory functions
__all__ = [
    "save_user_memory",
    "save_detected_memory", 
    "retrieve_user_memory",
    "search_user_memories",
    "list_all_user_memories",
    "clear_user_memory",
    "get_user_context_summary"
]
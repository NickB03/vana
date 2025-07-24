"""
Memory Reader Tool for ADK Agents

This tool allows agents to read memory state values during execution.
It provides read-only access to user, app, and session state.
"""

from typing import Dict, Any, Optional
from google.adk.tools import ToolContext
from lib.logging_config import get_logger

logger = get_logger("vana.memory_reader")


def read_user_memory(
    key: Optional[str] = None,
    tool_context: ToolContext = None
) -> Dict[str, Any]:
    """
    Read user memory from persistent state.
    
    This tool allows agents to access saved user information like name,
    preferences, goals, and other context that persists across sessions.
    
    Args:
        key: Optional specific key to read (e.g., "name"). 
             If None, returns all user memory.
        tool_context: ADK ToolContext with state access
        
    Returns:
        Dictionary with requested memory values
        
    Examples:
        - read_user_memory() -> Returns all user memory
        - read_user_memory("name") -> Returns just the user's name
    """
    try:
        if not tool_context or not hasattr(tool_context, 'state'):
            return {
                "error": "No state access available",
                "status": "failed"
            }
        
        # If specific key requested
        if key:
            state_key = f"user:{key}"
            value = tool_context.state.get(state_key)
            
            if value is not None:
                logger.info(f"Retrieved user:{key} = {value}")
                return {
                    "status": "success",
                    "key": key,
                    "value": value
                }
            else:
                return {
                    "status": "not_found",
                    "key": key,
                    "message": f"No memory found for key: {key}"
                }
        
        # Return all user memory
        user_memory = {}
        for state_key, value in tool_context.state.items():
            if state_key.startswith("user:"):
                memory_key = state_key.replace("user:", "")
                user_memory[memory_key] = value
        
        if user_memory:
            logger.info(f"Retrieved {len(user_memory)} user memory items")
            return {
                "status": "success",
                "memory": user_memory
            }
        else:
            return {
                "status": "empty",
                "message": "No user memory found"
            }
            
    except Exception as e:
        logger.error(f"Error reading user memory: {e}")
        return {
            "error": str(e),
            "status": "failed"
        }


def check_user_context(tool_context: ToolContext = None) -> Dict[str, Any]:
    """
    Check for any available user context in state.
    
    This is a simple tool that checks for user information without
    requiring specific keys. Useful for answering questions like
    "Do you know my name?" or "What do you remember about me?"
    
    Args:
        tool_context: ADK ToolContext with state access
        
    Returns:
        Summary of known user information
    """
    try:
        if not tool_context or not hasattr(tool_context, 'state'):
            return {
                "status": "no_memory",
                "message": "I don't have access to any memories right now."
            }
        
        # Check common user memory keys
        known_info = []
        
        # Check for name
        name = tool_context.state.get("user:name")
        if name:
            known_info.append(f"Your name is {name}")
        
        # Check for preferences
        preferences = tool_context.state.get("user:preferences")
        if preferences:
            known_info.append(f"Your preferences: {preferences}")
        
        # Check for goals
        goals = tool_context.state.get("user:goals")
        if goals:
            known_info.append(f"Your goals: {goals}")
        
        # Check for other user: prefixed keys
        other_info = []
        for key, value in tool_context.state.items():
            if key.startswith("user:") and key not in ["user:name", "user:preferences", "user:goals"]:
                clean_key = key.replace("user:", "").replace("_", " ")
                other_info.append(f"{clean_key}: {value}")
        
        if other_info:
            known_info.extend(other_info)
        
        if known_info:
            return {
                "status": "found",
                "known_information": known_info,
                "summary": ". ".join(known_info)
            }
        else:
            return {
                "status": "no_memory", 
                "message": "I don't have any information about you stored yet."
            }
            
    except Exception as e:
        logger.error(f"Error checking user context: {e}")
        return {
            "status": "error",
            "message": "I had trouble checking my memory."
        }


# Export tools
__all__ = ["read_user_memory", "check_user_context"]
"""
Memory Callbacks for ADK Agents

This module provides callbacks that automatically detect and save important
information from agent conversations using the memory detection patterns
and storage tools.

Implements after_agent_callback to analyze agent responses for memorable info.
"""

from typing import Optional
from google.adk.agents.callback_context import CallbackContext
from google.genai import types
from lib.logging_config import get_logger
from lib._tools.memory_detection_patterns import create_memory_detector
from lib._tools.adk_memory_tool import save_detected_memory, get_user_context_summary

logger = get_logger("vana.memory_callbacks")


def memory_detection_callback(callback_context: CallbackContext) -> Optional[types.Content]:
    """
    After agent callback that detects and saves important memories.
    
    This callback runs after an agent completes its response, analyzing
    both user input and agent output for memorable information.
    
    Args:
        callback_context: ADK CallbackContext with state access
        
    Returns:
        None to use agent's original output (memories saved silently)
    """
    try:
        # Get agent name for logging
        agent_name = callback_context.agent_name
        invocation_id = callback_context.invocation_id
        
        logger.debug(f"Memory callback triggered for agent: {agent_name} (inv: {invocation_id})")
        
        # Create memory detector
        detector = create_memory_detector()
        
        # Analyze user input if available
        memories_detected = []
        
        if callback_context.user_content and callback_context.user_content.parts:
            user_text = ""
            for part in callback_context.user_content.parts:
                if part.text:
                    user_text += part.text + " "
            
            if user_text.strip():
                logger.debug(f"Analyzing user input: '{user_text[:100]}...'")
                user_memories = detector.detect_memories(user_text)
                
                # Filter for important memories (threshold 0.6)
                important_memories = [m for m in user_memories if m.importance_score >= 0.6]
                memories_detected.extend(important_memories)
                
                logger.info(f"Detected {len(important_memories)} important memories from user input")
        
        # Note: We could also analyze agent responses here, but for now
        # we focus on user input to avoid saving agent-generated info
        
        # Save detected memories
        saved_count = 0
        for memory in memories_detected:
            # Create a mock ToolContext that wraps callback_context.state
            class CallbackToolContext:
                def __init__(self, callback_state):
                    self.state = callback_state
                    self.invocation_id = invocation_id
                    self.agent_name = agent_name
            
            tool_context = CallbackToolContext(callback_context.state)
            
            result = save_detected_memory(memory, tool_context)
            if result.get("status") == "success":
                saved_count += 1
                logger.info(f"Saved memory: {memory.key} = {memory.value} (type: {memory.memory_type.value})")
        
        if saved_count > 0:
            logger.info(f"✅ Successfully saved {saved_count} memories for user")
            
            # Optionally add a note to temp state for debugging
            callback_context.state["temp:last_memory_save"] = {
                "count": saved_count,
                "timestamp": callback_context.invocation_id,
                "agent": agent_name
            }
        
        # Always return None to use agent's original response
        # Memory saving happens silently in the background
        return None
        
    except Exception as e:
        logger.error(f"Error in memory detection callback: {e}")
        # Don't fail the agent execution due to memory errors
        return None


def memory_context_injection_callback(callback_context: CallbackContext) -> Optional[types.Content]:
    """
    Before agent callback that injects user context into agent's awareness.
    
    This callback runs before an agent processes a request, adding relevant
    user information to the agent's context through state.
    
    Args:
        callback_context: ADK CallbackContext with state access
        
    Returns:
        None to proceed with normal agent execution
    """
    try:
        agent_name = callback_context.agent_name
        logger.debug(f"Injecting user context for agent: {agent_name}")
        
        # Create mock ToolContext for get_user_context_summary
        class CallbackToolContext:
            def __init__(self, callback_state):
                self.state = callback_state
        
        tool_context = CallbackToolContext(callback_context.state)
        
        # Get user context summary
        user_context = get_user_context_summary(tool_context)
        
        # Store in temp state for agent to access
        if user_context and user_context != "No user context available.":
            callback_context.state["temp:user_context"] = user_context
            logger.info(f"Injected user context: {user_context[:100]}...")
        
        # Continue with normal agent execution
        return None
        
    except Exception as e:
        logger.error(f"Error in context injection callback: {e}")
        # Don't fail the agent execution
        return None


def create_memory_aware_callbacks():
    """
    Factory function to create a dictionary of memory-related callbacks.
    
    Returns:
        Dict with callback functions for agent configuration
    """
    return {
        "after_agent_callback": memory_detection_callback,
        "before_agent_callback": memory_context_injection_callback
    }


# For convenience, export individual callbacks
__all__ = [
    "memory_detection_callback",
    "memory_context_injection_callback", 
    "create_memory_aware_callbacks"
]
"""
ADK State Manager for VANA

This module provides state synchronization between VANA and ADK,
ensuring consistent state across both systems.
"""

import os
import logging
import json
from typing import Dict, Any, Optional, List, Union

# Import ADK components with error handling
try:
    from google.adk.sessions import Session
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    # Create placeholder classes for type hints
    class Session:
        pass

from vana.context import ConversationContextManager, ConversationContext
from .adk_session_adapter import ADKSessionAdapter

# Set up logging
logger = logging.getLogger(__name__)

class ADKStateManager:
    """Manager for synchronizing state between VANA and ADK."""
    
    def __init__(self, session_adapter: Optional[ADKSessionAdapter] = None,
                context_manager: Optional[ConversationContextManager] = None):
        """
        Initialize the ADK State Manager.
        
        Args:
            session_adapter: ADKSessionAdapter instance (optional)
            context_manager: ConversationContextManager instance (optional)
        """
        self.context_manager = context_manager or ConversationContextManager()
        self.session_adapter = session_adapter or ADKSessionAdapter(self.context_manager)
        self.adk_available = self.session_adapter.is_adk_available()
        
        if not self.adk_available:
            logger.warning("ADK not available, using fallback state management")
            
    def is_adk_available(self) -> bool:
        """
        Check if ADK is available.
        
        Returns:
            True if ADK is available, False otherwise
        """
        return self.adk_available
        
    def get_state(self, context_id: str) -> Dict[str, Any]:
        """
        Get the current state for a context.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            State dictionary
        """
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return {}
                
            # Get state from VANA context
            state = {
                "data": context.data,
                "messages": context.messages,
                "entities": context.entities,
                "summary": context.summary,
                "scope": context.scope,
                "user_id": context.user_id,
                "session_id": context.session_id
            }
            
            # Get additional state from ADK session if available
            if self.adk_available:
                adk_session = self.session_adapter.get_adk_session(context_id)
                if adk_session:
                    # Add ADK-specific state
                    state["adk"] = {k: v for k, v in adk_session.state.items() 
                                   if k not in ["messages", "entities"]}
                    
            return state
        except Exception as e:
            logger.error(f"Error getting state: {e}")
            return {}
            
    def set_state(self, context_id: str, state: Dict[str, Any]) -> bool:
        """
        Set the state for a context.
        
        Args:
            context_id: VANA context ID
            state: State dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Update VANA context
            if "data" in state:
                context.data.update(state["data"])
                
            if "messages" in state:
                context.messages = state["messages"]
                
            if "entities" in state:
                context.entities = state["entities"]
                
            if "summary" in state:
                context.set_summary(state["summary"])
                
            # Save VANA context
            self.context_manager.save_conversation_context(context)
            
            # Update ADK session if available
            if self.adk_available:
                adk_session = self.session_adapter.get_adk_session(context_id)
                if adk_session:
                    # Update ADK state
                    if "data" in state:
                        for key, value in state["data"].items():
                            adk_session.state[key] = value
                            
                    if "messages" in state:
                        adk_session.state["messages"] = state["messages"]
                        
                    if "entities" in state:
                        adk_session.state["entities"] = state["entities"]
                        
                    # Update ADK-specific state
                    if "adk" in state:
                        for key, value in state["adk"].items():
                            adk_session.state[key] = value
                            
            return True
        except Exception as e:
            logger.error(f"Error setting state: {e}")
            return False
            
    def update_state(self, context_id: str, key: str, value: Any) -> bool:
        """
        Update a specific state value.
        
        Args:
            context_id: VANA context ID
            key: State key
            value: State value
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Update VANA context
            context.data[key] = value
            self.context_manager.save_conversation_context(context)
            
            # Update ADK session if available
            if self.adk_available:
                adk_session = self.session_adapter.get_adk_session(context_id)
                if adk_session:
                    adk_session.state[key] = value
                    
            return True
        except Exception as e:
            logger.error(f"Error updating state: {e}")
            return False
            
    def get_state_value(self, context_id: str, key: str, default: Any = None) -> Any:
        """
        Get a specific state value.
        
        Args:
            context_id: VANA context ID
            key: State key
            default: Default value if key not found
            
        Returns:
            State value or default
        """
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return default
                
            # Get value from VANA context
            if key in context.data:
                return context.data[key]
                
            # Try to get value from ADK session if available
            if self.adk_available:
                adk_session = self.session_adapter.get_adk_session(context_id)
                if adk_session and key in adk_session.state:
                    return adk_session.state[key]
                    
            return default
        except Exception as e:
            logger.error(f"Error getting state value: {e}")
            return default
            
    def sync_state(self, context_id: str) -> bool:
        """
        Synchronize state between VANA and ADK.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.adk_available:
            logger.warning("ADK not available, cannot sync state")
            return False
            
        return self.session_adapter.sync_session_state(context_id)
        
    def serialize_state(self, context_id: str) -> str:
        """
        Serialize the state for a context to JSON.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            JSON string
        """
        try:
            state = self.get_state(context_id)
            return json.dumps(state)
        except Exception as e:
            logger.error(f"Error serializing state: {e}")
            return "{}"
            
    def deserialize_state(self, context_id: str, state_json: str) -> bool:
        """
        Deserialize a JSON string to state and apply it.
        
        Args:
            context_id: VANA context ID
            state_json: JSON string
            
        Returns:
            True if successful, False otherwise
        """
        try:
            state = json.loads(state_json)
            return self.set_state(context_id, state)
        except Exception as e:
            logger.error(f"Error deserializing state: {e}")
            return False

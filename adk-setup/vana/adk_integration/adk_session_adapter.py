"""
ADK Session Adapter for VANA

This module provides a bridge between VANA contexts and ADK sessions,
allowing for seamless integration between the two systems.
"""

import os
import logging
import uuid
from typing import Dict, Any, Optional, List

# Import ADK components with error handling
try:
    from google.adk.sessions import Session, InMemorySessionService
    ADK_AVAILABLE = True
except ImportError:
    ADK_AVAILABLE = False
    # Create placeholder classes for type hints
    class Session:
        pass
    class InMemorySessionService:
        pass

from vana.context import ConversationContextManager, ConversationContext

# Set up logging
logger = logging.getLogger(__name__)

class ADKSessionAdapter:
    """Bridge between VANA contexts and ADK sessions."""
    
    def __init__(self, context_manager: Optional[ConversationContextManager] = None):
        """
        Initialize the ADK Session Adapter.
        
        Args:
            context_manager: ConversationContextManager instance (optional)
        """
        self.context_manager = context_manager or ConversationContextManager()
        self.app_name = os.environ.get("APP_NAME", "vana")
        
        # Initialize ADK session service if available
        self.adk_available = ADK_AVAILABLE
        if self.adk_available:
            try:
                self.session_service = InMemorySessionService()
                logger.info("ADK Session Service initialized")
            except Exception as e:
                logger.error(f"Error initializing ADK Session Service: {e}")
                self.adk_available = False
        else:
            logger.warning("ADK not available, using fallback session handling")
            
        # Session mapping
        self.session_map = {}  # Maps VANA context IDs to ADK session IDs
        
    def is_adk_available(self) -> bool:
        """
        Check if ADK is available.
        
        Returns:
            True if ADK is available, False otherwise
        """
        return self.adk_available
        
    def create_session(self, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new session in both VANA and ADK.
        
        Args:
            user_id: User ID
            session_id: Session ID (optional, will be generated if not provided)
            
        Returns:
            Dictionary with session information
        """
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
            
        # Create VANA context
        context = self.context_manager.create_conversation_context(
            user_id=user_id,
            session_id=session_id
        )
        
        # Create ADK session if available
        adk_session = None
        if self.adk_available:
            try:
                adk_session = self.session_service.create_session(
                    app_name=self.app_name,
                    user_id=user_id,
                    session_id=session_id
                )
                logger.info(f"Created ADK session: {adk_session.session_id} for user: {user_id}")
                
                # Map VANA context to ADK session
                self.session_map[context.id] = adk_session.session_id
            except Exception as e:
                logger.error(f"Error creating ADK session: {e}")
                
        # Return session information
        return {
            "vana_context_id": context.id,
            "adk_session_id": adk_session.session_id if adk_session else None,
            "user_id": user_id,
            "session_id": session_id
        }
        
    def get_session(self, context_id: str) -> Dict[str, Any]:
        """
        Get session information for a VANA context.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            Dictionary with session information
        """
        # Get VANA context
        context = self.context_manager.get_conversation_context(context_id)
        if not context:
            logger.warning(f"Context not found: {context_id}")
            return {}
            
        # Get ADK session if available
        adk_session = None
        if self.adk_available and context_id in self.session_map:
            try:
                adk_session_id = self.session_map[context_id]
                adk_session = self.session_service.get_session(
                    app_name=self.app_name,
                    user_id=context.user_id,
                    session_id=adk_session_id
                )
            except Exception as e:
                logger.error(f"Error getting ADK session: {e}")
                
        # Return session information
        return {
            "vana_context_id": context.id,
            "adk_session_id": adk_session.session_id if adk_session else None,
            "user_id": context.user_id,
            "session_id": context.session_id
        }
        
    def sync_session_state(self, context_id: str) -> bool:
        """
        Synchronize state between VANA context and ADK session.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            True if successful, False otherwise
        """
        if not self.adk_available:
            logger.warning("ADK not available, cannot sync session state")
            return False
            
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Get ADK session
            if context_id not in self.session_map:
                logger.warning(f"No ADK session mapped for context: {context_id}")
                return False
                
            adk_session_id = self.session_map[context_id]
            adk_session = self.session_service.get_session(
                app_name=self.app_name,
                user_id=context.user_id,
                session_id=adk_session_id
            )
            
            # Sync state from VANA to ADK
            for key, value in context.data.items():
                adk_session.state[key] = value
                
            # Sync messages
            if context.messages:
                adk_session.state["messages"] = context.messages
                
            # Sync entities
            if context.entities:
                adk_session.state["entities"] = context.entities
                
            logger.info(f"Synced state from VANA to ADK for context: {context_id}")
            
            # Sync state from ADK to VANA
            for key, value in adk_session.state.items():
                if key not in ["messages", "entities"]:  # Skip these as we've already synced them
                    context.data[key] = value
                    
            # Save VANA context
            self.context_manager.save_conversation_context(context)
            
            logger.info(f"Synced state from ADK to VANA for context: {context_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error syncing session state: {e}")
            return False
            
    def get_adk_session(self, context_id: str) -> Optional[Session]:
        """
        Get the ADK session for a VANA context.
        
        Args:
            context_id: VANA context ID
            
        Returns:
            ADK session or None if not available
        """
        if not self.adk_available:
            logger.warning("ADK not available, cannot get ADK session")
            return None
            
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return None
                
            # Get ADK session
            if context_id not in self.session_map:
                logger.warning(f"No ADK session mapped for context: {context_id}")
                return None
                
            adk_session_id = self.session_map[context_id]
            adk_session = self.session_service.get_session(
                app_name=self.app_name,
                user_id=context.user_id,
                session_id=adk_session_id
            )
            
            return adk_session
        except Exception as e:
            logger.error(f"Error getting ADK session: {e}")
            return None
            
    def get_vana_context(self, adk_session_id: str, user_id: str) -> Optional[ConversationContext]:
        """
        Get the VANA context for an ADK session.
        
        Args:
            adk_session_id: ADK session ID
            user_id: User ID
            
        Returns:
            VANA context or None if not found
        """
        try:
            # Find context ID from session map
            context_id = None
            for vana_id, adk_id in self.session_map.items():
                if adk_id == adk_session_id:
                    context_id = vana_id
                    break
                    
            if not context_id:
                logger.warning(f"No VANA context mapped for ADK session: {adk_session_id}")
                return None
                
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return None
                
            return context
        except Exception as e:
            logger.error(f"Error getting VANA context: {e}")
            return None
            
    def add_message_to_session(self, context_id: str, role: str, content: str) -> bool:
        """
        Add a message to both VANA context and ADK session.
        
        Args:
            context_id: VANA context ID
            role: Message role (user or assistant)
            content: Message content
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get VANA context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add message to VANA context
            context.add_message(role, content)
            self.context_manager.save_conversation_context(context)
            
            # Add message to ADK session if available
            if self.adk_available and context_id in self.session_map:
                adk_session_id = self.session_map[context_id]
                adk_session = self.session_service.get_session(
                    app_name=self.app_name,
                    user_id=context.user_id,
                    session_id=adk_session_id
                )
                
                # Initialize messages list if not present
                if "messages" not in adk_session.state:
                    adk_session.state["messages"] = []
                    
                # Add message
                adk_session.state["messages"].append({
                    "role": role,
                    "content": content,
                    "timestamp": context.messages[-1]["timestamp"]
                })
                
            return True
        except Exception as e:
            logger.error(f"Error adding message to session: {e}")
            return False

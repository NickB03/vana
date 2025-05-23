"""
ADK Event Handler for VANA

This module provides event handling for ADK events,
allowing VANA to respond to events from the ADK framework.
"""

import os
import logging
import json
from typing import Dict, Any, Optional, List, Callable, Union

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
from .adk_state_manager import ADKStateManager

# Set up logging
logger = logging.getLogger(__name__)

class ADKEventHandler:
    """Handler for ADK events."""
    
    # Event types
    EVENT_SESSION_CREATED = "session_created"
    EVENT_SESSION_UPDATED = "session_updated"
    EVENT_MESSAGE_RECEIVED = "message_received"
    EVENT_MESSAGE_SENT = "message_sent"
    EVENT_TOOL_CALLED = "tool_called"
    EVENT_TOOL_RESPONSE = "tool_response"
    EVENT_ERROR = "error"
    
    def __init__(self, session_adapter: Optional[ADKSessionAdapter] = None,
                state_manager: Optional[ADKStateManager] = None,
                context_manager: Optional[ConversationContextManager] = None):
        """
        Initialize the ADK Event Handler.
        
        Args:
            session_adapter: ADKSessionAdapter instance (optional)
            state_manager: ADKStateManager instance (optional)
            context_manager: ConversationContextManager instance (optional)
        """
        self.context_manager = context_manager or ConversationContextManager()
        self.session_adapter = session_adapter or ADKSessionAdapter(self.context_manager)
        self.state_manager = state_manager or ADKStateManager(self.session_adapter, self.context_manager)
        self.adk_available = self.session_adapter.is_adk_available()
        
        # Event handlers
        self.event_handlers = {
            self.EVENT_SESSION_CREATED: [],
            self.EVENT_SESSION_UPDATED: [],
            self.EVENT_MESSAGE_RECEIVED: [],
            self.EVENT_MESSAGE_SENT: [],
            self.EVENT_TOOL_CALLED: [],
            self.EVENT_TOOL_RESPONSE: [],
            self.EVENT_ERROR: []
        }
        
        if not self.adk_available:
            logger.warning("ADK not available, using fallback event handling")
            
    def is_adk_available(self) -> bool:
        """
        Check if ADK is available.
        
        Returns:
            True if ADK is available, False otherwise
        """
        return self.adk_available
        
    def register_event_handler(self, event_type: str, handler: Callable) -> bool:
        """
        Register an event handler.
        
        Args:
            event_type: Event type
            handler: Event handler function
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if event_type not in self.event_handlers:
                logger.warning(f"Unknown event type: {event_type}")
                return False
                
            self.event_handlers[event_type].append(handler)
            logger.info(f"Registered handler for event type: {event_type}")
            return True
        except Exception as e:
            logger.error(f"Error registering event handler: {e}")
            return False
            
    def unregister_event_handler(self, event_type: str, handler: Callable) -> bool:
        """
        Unregister an event handler.
        
        Args:
            event_type: Event type
            handler: Event handler function
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if event_type not in self.event_handlers:
                logger.warning(f"Unknown event type: {event_type}")
                return False
                
            if handler in self.event_handlers[event_type]:
                self.event_handlers[event_type].remove(handler)
                logger.info(f"Unregistered handler for event type: {event_type}")
                return True
            else:
                logger.warning(f"Handler not found for event type: {event_type}")
                return False
        except Exception as e:
            logger.error(f"Error unregistering event handler: {e}")
            return False
            
    def trigger_event(self, event_type: str, event_data: Dict[str, Any]) -> bool:
        """
        Trigger an event.
        
        Args:
            event_type: Event type
            event_data: Event data
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if event_type not in self.event_handlers:
                logger.warning(f"Unknown event type: {event_type}")
                return False
                
            # Add timestamp to event data
            import time
            event_data["timestamp"] = time.time()
            
            # Call event handlers
            for handler in self.event_handlers[event_type]:
                try:
                    handler(event_data)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
                    
            return True
        except Exception as e:
            logger.error(f"Error triggering event: {e}")
            return False
            
    def handle_session_created(self, session_id: str, user_id: str, context_id: str) -> bool:
        """
        Handle session created event.
        
        Args:
            session_id: Session ID
            user_id: User ID
            context_id: Context ID
            
        Returns:
            True if successful, False otherwise
        """
        event_data = {
            "session_id": session_id,
            "user_id": user_id,
            "context_id": context_id
        }
        return self.trigger_event(self.EVENT_SESSION_CREATED, event_data)
        
    def handle_session_updated(self, session_id: str, user_id: str, context_id: str) -> bool:
        """
        Handle session updated event.
        
        Args:
            session_id: Session ID
            user_id: User ID
            context_id: Context ID
            
        Returns:
            True if successful, False otherwise
        """
        event_data = {
            "session_id": session_id,
            "user_id": user_id,
            "context_id": context_id
        }
        return self.trigger_event(self.EVENT_SESSION_UPDATED, event_data)
        
    def handle_message_received(self, context_id: str, message: str) -> bool:
        """
        Handle message received event.
        
        Args:
            context_id: Context ID
            message: Message content
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add message to context
            context.add_message("user", message)
            self.context_manager.save_conversation_context(context)
            
            # Sync with ADK session
            if self.adk_available:
                self.session_adapter.add_message_to_session(context_id, "user", message)
                
            # Trigger event
            event_data = {
                "context_id": context_id,
                "session_id": context.session_id,
                "user_id": context.user_id,
                "message": message,
                "role": "user"
            }
            return self.trigger_event(self.EVENT_MESSAGE_RECEIVED, event_data)
        except Exception as e:
            logger.error(f"Error handling message received: {e}")
            return False
            
    def handle_message_sent(self, context_id: str, message: str) -> bool:
        """
        Handle message sent event.
        
        Args:
            context_id: Context ID
            message: Message content
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add message to context
            context.add_message("assistant", message)
            self.context_manager.save_conversation_context(context)
            
            # Sync with ADK session
            if self.adk_available:
                self.session_adapter.add_message_to_session(context_id, "assistant", message)
                
            # Trigger event
            event_data = {
                "context_id": context_id,
                "session_id": context.session_id,
                "user_id": context.user_id,
                "message": message,
                "role": "assistant"
            }
            return self.trigger_event(self.EVENT_MESSAGE_SENT, event_data)
        except Exception as e:
            logger.error(f"Error handling message sent: {e}")
            return False
            
    def handle_tool_called(self, context_id: str, tool_name: str, tool_args: Dict[str, Any]) -> bool:
        """
        Handle tool called event.
        
        Args:
            context_id: Context ID
            tool_name: Tool name
            tool_args: Tool arguments
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add tool call to context data
            if "tool_calls" not in context.data:
                context.data["tool_calls"] = []
                
            tool_call = {
                "tool_name": tool_name,
                "tool_args": tool_args,
                "timestamp": context.updated_at
            }
            context.data["tool_calls"].append(tool_call)
            self.context_manager.save_conversation_context(context)
            
            # Sync with ADK session
            if self.adk_available:
                self.state_manager.sync_state(context_id)
                
            # Trigger event
            event_data = {
                "context_id": context_id,
                "session_id": context.session_id,
                "user_id": context.user_id,
                "tool_name": tool_name,
                "tool_args": tool_args
            }
            return self.trigger_event(self.EVENT_TOOL_CALLED, event_data)
        except Exception as e:
            logger.error(f"Error handling tool called: {e}")
            return False
            
    def handle_tool_response(self, context_id: str, tool_name: str, 
                            tool_args: Dict[str, Any], response: Any) -> bool:
        """
        Handle tool response event.
        
        Args:
            context_id: Context ID
            tool_name: Tool name
            tool_args: Tool arguments
            response: Tool response
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add tool response to context data
            if "tool_responses" not in context.data:
                context.data["tool_responses"] = []
                
            tool_response = {
                "tool_name": tool_name,
                "tool_args": tool_args,
                "response": response,
                "timestamp": context.updated_at
            }
            context.data["tool_responses"].append(tool_response)
            self.context_manager.save_conversation_context(context)
            
            # Sync with ADK session
            if self.adk_available:
                self.state_manager.sync_state(context_id)
                
            # Trigger event
            event_data = {
                "context_id": context_id,
                "session_id": context.session_id,
                "user_id": context.user_id,
                "tool_name": tool_name,
                "tool_args": tool_args,
                "response": response
            }
            return self.trigger_event(self.EVENT_TOOL_RESPONSE, event_data)
        except Exception as e:
            logger.error(f"Error handling tool response: {e}")
            return False
            
    def handle_error(self, context_id: str, error_message: str, error_type: str = "general") -> bool:
        """
        Handle error event.
        
        Args:
            context_id: Context ID
            error_message: Error message
            error_type: Error type
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Get context
            context = self.context_manager.get_conversation_context(context_id)
            if not context:
                logger.warning(f"Context not found: {context_id}")
                return False
                
            # Add error to context data
            if "errors" not in context.data:
                context.data["errors"] = []
                
            error = {
                "error_type": error_type,
                "error_message": error_message,
                "timestamp": context.updated_at
            }
            context.data["errors"].append(error)
            self.context_manager.save_conversation_context(context)
            
            # Sync with ADK session
            if self.adk_available:
                self.state_manager.sync_state(context_id)
                
            # Trigger event
            event_data = {
                "context_id": context_id,
                "session_id": context.session_id if context else None,
                "user_id": context.user_id if context else None,
                "error_type": error_type,
                "error_message": error_message
            }
            return self.trigger_event(self.EVENT_ERROR, event_data)
        except Exception as e:
            logger.error(f"Error handling error event: {e}")
            return False

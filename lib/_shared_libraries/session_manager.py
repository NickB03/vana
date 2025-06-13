"""
ADK Session Manager for VANA

This module provides session management utilities using Google ADK's native session services.
It supports both VertexAiSessionService for production and InMemorySessionService for development.

Key Features:
- VertexAiSessionService integration for production
- InMemorySessionService for development/testing
- Session state management with ADK patterns
- Automatic session creation and management
- State sharing between agents via output_key

Usage:
    ```python
    from lib._shared_libraries.session_manager import ADKSessionManager
    
    # Initialize session manager
    session_manager = ADKSessionManager()
    
    # Create session
    session = await session_manager.create_session(
        app_name="vana_app",
        user_id="user_123",
        initial_state={"preference": "dark_mode"}
    )
    
    # Get session
    session = await session_manager.get_session(
        app_name="vana_app",
        user_id="user_123",
        session_id="session_456"
    )
    ```
"""

import os
import logging
from typing import Dict, Any, Optional
from google.adk.sessions import (
    VertexAiSessionService, 
    InMemorySessionService, 
    Session
)

# Configure logging
logger = logging.getLogger(__name__)

class ADKSessionManager:
    """
    ADK Session Manager providing integration with Google ADK's native session services.
    
    This manager provides a unified interface for session operations using Google ADK's
    VertexAiSessionService for production and InMemorySessionService for development/testing.
    """
    
    def __init__(self, use_vertex_ai: bool = True):
        """
        Initialize the ADK Session Manager.
        
        Args:
            use_vertex_ai: Whether to use VertexAiSessionService (True) or InMemorySessionService (False)
        """
        self.use_vertex_ai = use_vertex_ai
        self.session_service = None
        self._initialize_session_service()
        
    def _initialize_session_service(self):
        """Initialize the appropriate session service based on configuration."""
        try:
            if self.use_vertex_ai:
                # Initialize VertexAiSessionService for production
                project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
                location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
                
                self.session_service = VertexAiSessionService(
                    project=project_id,
                    location=location
                )
                logger.info(f"Initialized VertexAiSessionService for project: {project_id}, location: {location}")
                
            else:
                # Initialize InMemorySessionService for development/testing
                self.session_service = InMemorySessionService()
                logger.info("Initialized InMemorySessionService for development/testing")
                
        except Exception as e:
            logger.error(f"Failed to initialize ADK session service: {e}")
            # Fallback to InMemorySessionService
            self.session_service = InMemorySessionService()
            logger.warning("Falling back to InMemorySessionService")
    
    async def create_session(
        self, 
        app_name: str, 
        user_id: str, 
        session_id: Optional[str] = None,
        initial_state: Optional[Dict[str, Any]] = None
    ) -> Session:
        """
        Create a new session with optional initial state.
        
        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Optional session identifier (auto-generated if not provided)
            initial_state: Optional initial state dictionary
            
        Returns:
            The created Session object
        """
        try:
            if not self.session_service:
                raise RuntimeError("Session service not initialized")
            
            session = await self.session_service.create_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id,
                state=initial_state
            )
            
            logger.info(f"Created session {session.id} for user {user_id} in app {app_name}")
            return session
            
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            raise
    
    async def get_session(
        self, 
        app_name: str, 
        user_id: str, 
        session_id: str
    ) -> Optional[Session]:
        """
        Retrieve an existing session.
        
        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            The Session object if found, None otherwise
        """
        try:
            if not self.session_service:
                logger.warning("Session service not initialized")
                return None
            
            session = await self.session_service.get_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id
            )
            
            if session:
                logger.info(f"Retrieved session {session_id} for user {user_id}")
            else:
                logger.warning(f"Session {session_id} not found for user {user_id}")
            
            return session
            
        except Exception as e:
            logger.error(f"Error retrieving session: {e}")
            return None
    
    async def update_session_state(
        self,
        session: Session,
        state_updates: Dict[str, Any]
    ) -> bool:
        """
        Update session state with new values.
        
        Args:
            session: The session to update
            state_updates: Dictionary of state updates
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Update session state directly
            for key, value in state_updates.items():
                session.state[key] = value
            
            logger.info(f"Updated session {session.id} state with {len(state_updates)} keys")
            return True
            
        except Exception as e:
            logger.error(f"Error updating session state: {e}")
            return False
    
    async def delete_session(
        self, 
        app_name: str, 
        user_id: str, 
        session_id: str
    ) -> bool:
        """
        Delete a session.
        
        Args:
            app_name: Application name
            user_id: User identifier
            session_id: Session identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.session_service:
                logger.warning("Session service not initialized")
                return False
            
            await self.session_service.delete_session(
                app_name=app_name,
                user_id=user_id,
                session_id=session_id
            )
            
            logger.info(f"Deleted session {session_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False
    
    def is_available(self) -> bool:
        """
        Check if the session service is available and operational.
        
        Returns:
            True if available, False otherwise
        """
        return self.session_service is not None
    
    def get_service_info(self) -> Dict[str, Any]:
        """
        Get information about the current session service configuration.
        
        Returns:
            Dictionary with service information
        """
        return {
            "service_type": "VertexAiSessionService" if self.use_vertex_ai else "InMemorySessionService",
            "available": self.is_available(),
            "supports_persistence": self.use_vertex_ai,
            "supports_state_management": True
        }

# Global instance for easy access
_adk_session_manager = None

def get_adk_session_manager() -> ADKSessionManager:
    """
    Get the global ADK session manager instance.
    
    Returns:
        The global ADKSessionManager instance
    """
    global _adk_session_manager
    if _adk_session_manager is None:
        # Determine if we should use Vertex AI based on environment
        use_vertex_ai = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "1") == "1"
        _adk_session_manager = ADKSessionManager(use_vertex_ai=use_vertex_ai)
    return _adk_session_manager

def reset_adk_session_manager():
    """Reset the global ADK session manager instance (useful for testing)."""
    global _adk_session_manager
    _adk_session_manager = None

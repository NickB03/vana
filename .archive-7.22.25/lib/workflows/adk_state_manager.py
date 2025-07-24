"""
ADK-Compliant State Manager for VANA

This module replaces the Redis-based state_manager.py with proper ADK session state patterns.
Uses session.state with appropriate prefixes for different scopes:
- No prefix: Session-specific (current conversation)
- user: User-specific (persists across sessions)
- app: Application-wide (global settings)
- temp: Temporary (never persisted)
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional
from google.adk.sessions import Session


class WorkflowStatus(str, Enum):
    """Workflow execution status states"""
    INITIAL = "initial"
    PROCESSING = "processing"
    WAITING = "waiting"
    REVIEW = "review"
    COMPLETE = "complete"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ADKStateManager:
    """
    ADK-compliant state manager using session.state
    
    Replaces the Redis-based state_manager.py with proper ADK patterns.
    All state is stored in the session object and automatically persisted
    by the SessionService (InMemory for dev, VertexAI for production).
    """
    
    def __init__(self, session: Session):
        """
        Initialize with ADK session
        
        Args:
            session: ADK Session object containing state
        """
        self.session = session
        
    def get_workflow_status(self, workflow_id: str) -> Optional[WorkflowStatus]:
        """
        Get current workflow status
        
        Args:
            workflow_id: Unique workflow identifier
            
        Returns:
            Current WorkflowStatus or None if not found
        """
        key = f"workflow:{workflow_id}:status"
        status = self.session.state.get(key)
        return WorkflowStatus(status) if status else None
    
    def set_workflow_status(self, workflow_id: str, status: WorkflowStatus):
        """
        Set workflow status with timestamp
        
        Args:
            workflow_id: Unique workflow identifier
            status: New workflow status
        """
        key = f"workflow:{workflow_id}:status"
        self.session.state[key] = status.value
        self.session.state[f"workflow:{workflow_id}:updated_at"] = datetime.now().isoformat()
    
    def get_workflow_context(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get workflow context data
        
        Args:
            workflow_id: Unique workflow identifier
            
        Returns:
            Context dictionary or empty dict if not found
        """
        key = f"workflow:{workflow_id}:context"
        return self.session.state.get(key, {})
    
    def update_workflow_context(self, workflow_id: str, updates: Dict[str, Any]):
        """
        Update workflow context with new data
        
        Args:
            workflow_id: Unique workflow identifier
            updates: Dictionary of updates to merge
        """
        key = f"workflow:{workflow_id}:context"
        context = self.session.state.get(key, {})
        context.update(updates)
        self.session.state[key] = context
        self.session.state[f"workflow:{workflow_id}:updated_at"] = datetime.now().isoformat()
    
    # User Preferences (persist across sessions)
    def set_user_preference(self, key: str, value: Any):
        """
        Set user preference that persists across sessions
        
        Args:
            key: Preference key
            value: Preference value
        """
        self.session.state[f"user:{key}"] = value
    
    def get_user_preference(self, key: str, default: Any = None) -> Any:
        """
        Get user preference
        
        Args:
            key: Preference key
            default: Default value if not found
            
        Returns:
            Preference value or default
        """
        return self.session.state.get(f"user:{key}", default)
    
    # Application Configuration (global)
    def set_app_config(self, key: str, value: Any):
        """
        Set application-wide configuration
        
        Args:
            key: Configuration key
            value: Configuration value
        """
        self.session.state[f"app:{key}"] = value
    
    def get_app_config(self, key: str, default: Any = None) -> Any:
        """
        Get application configuration
        
        Args:
            key: Configuration key
            default: Default value if not found
            
        Returns:
            Configuration value or default
        """
        return self.session.state.get(f"app:{key}", default)
    
    # Temporary Data (never persisted)
    def set_temp_data(self, key: str, value: Any):
        """
        Set temporary data that won't be persisted
        
        Args:
            key: Temporary data key
            value: Temporary data value
        """
        self.session.state[f"temp:{key}"] = value
    
    def get_temp_data(self, key: str, default: Any = None) -> Any:
        """
        Get temporary data
        
        Args:
            key: Temporary data key
            default: Default value if not found
            
        Returns:
            Temporary data value or default
        """
        return self.session.state.get(f"temp:{key}", default)
    
    def clear_temp_data(self):
        """Clear all temporary data from session"""
        keys_to_remove = [k for k in self.session.state.keys() if k.startswith("temp:")]
        for key in keys_to_remove:
            del self.session.state[key]
"""
ADK-Compliant State Manager Example
This replaces the Redis-based state_manager.py
"""

from google.adk.sessions import Session
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum


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
    Uses session state prefixes for different scopes:
    - No prefix: Session-specific (current conversation)
    - user: User-specific (persists across sessions)
    - app: Application-wide (global settings)
    - temp: Temporary (never persisted)
    """
    
    def __init__(self, session: Session):
        """Initialize with ADK session"""
        self.session = session
        
    # Workflow State Management
    def get_workflow_status(self, workflow_id: str) -> Optional[WorkflowStatus]:
        """Get current workflow status"""
        key = f"workflow:{workflow_id}:status"
        status = self.session.state.get(key)
        return WorkflowStatus(status) if status else None
    
    def set_workflow_status(self, workflow_id: str, status: WorkflowStatus):
        """Set workflow status"""
        key = f"workflow:{workflow_id}:status"
        self.session.state[key] = status.value
        self.session.state[f"workflow:{workflow_id}:updated_at"] = datetime.now().isoformat()
    
    def get_workflow_context(self, workflow_id: str) -> Dict[str, Any]:
        """Get workflow context data"""
        key = f"workflow:{workflow_id}:context"
        return self.session.state.get(key, {})
    
    def update_workflow_context(self, workflow_id: str, updates: Dict[str, Any]):
        """Update workflow context"""
        key = f"workflow:{workflow_id}:context"
        context = self.session.state.get(key, {})
        context.update(updates)
        self.session.state[key] = context
    
    # User Preferences (persist across sessions)
    def set_user_preference(self, key: str, value: Any):
        """Set user preference that persists across sessions"""
        self.session.state[f"user:{key}"] = value
    
    def get_user_preference(self, key: str, default: Any = None) -> Any:
        """Get user preference"""
        return self.session.state.get(f"user:{key}", default)
    
    # Application Configuration (global)
    def set_app_config(self, key: str, value: Any):
        """Set application-wide configuration"""
        self.session.state[f"app:{key}"] = value
    
    def get_app_config(self, key: str, default: Any = None) -> Any:
        """Get application configuration"""
        return self.session.state.get(f"app:{key}", default)
    
    # Temporary Data (never persisted)
    def set_temp_data(self, key: str, value: Any):
        """Set temporary data that won't be persisted"""
        self.session.state[f"temp:{key}"] = value
    
    def get_temp_data(self, key: str, default: Any = None) -> Any:
        """Get temporary data"""
        return self.session.state.get(f"temp:{key}", default)
    
    def clear_temp_data(self):
        """Clear all temporary data"""
        keys_to_remove = [k for k in self.session.state.keys() if k.startswith("temp:")]
        for key in keys_to_remove:
            del self.session.state[key]
    
    # Workflow History (using session state)
    def add_workflow_transition(self, workflow_id: str, from_state: str, to_state: str, metadata: Optional[Dict] = None):
        """Add workflow transition to history"""
        history_key = f"workflow:{workflow_id}:history"
        history = self.session.state.get(history_key, [])
        
        transition = {
            "from": from_state,
            "to": to_state,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        history.append(transition)
        # Keep only last 20 transitions
        if len(history) > 20:
            history = history[-20:]
        
        self.session.state[history_key] = history
    
    def get_workflow_history(self, workflow_id: str) -> List[Dict[str, Any]]:
        """Get workflow transition history"""
        history_key = f"workflow:{workflow_id}:history"
        return self.session.state.get(history_key, [])
    
    # Progress Tracking
    def get_workflow_progress(self, workflow_id: str) -> Dict[str, Any]:
        """Get workflow progress information"""
        status = self.get_workflow_status(workflow_id)
        history = self.get_workflow_history(workflow_id)
        
        progress_map = {
            WorkflowStatus.INITIAL: 0,
            WorkflowStatus.PROCESSING: 30,
            WorkflowStatus.WAITING: 50,
            WorkflowStatus.REVIEW: 80,
            WorkflowStatus.COMPLETE: 100,
            WorkflowStatus.FAILED: -1,
            WorkflowStatus.CANCELLED: -1,
        }
        
        return {
            "workflow_id": workflow_id,
            "current_status": status.value if status else "unknown",
            "progress_percentage": progress_map.get(status, 0),
            "total_transitions": len(history),
            "updated_at": self.session.state.get(f"workflow:{workflow_id}:updated_at"),
            "is_complete": status == WorkflowStatus.COMPLETE,
            "is_failed": status in [WorkflowStatus.FAILED, WorkflowStatus.CANCELLED]
        }


# Example usage with ADK
async def example_usage():
    from google.adk.sessions import InMemorySessionService
    
    # Create session service
    session_service = InMemorySessionService()
    
    # Create session
    session = await session_service.create_session(
        app_name="vana",
        user_id="test_user",
        session_id="test_session"
    )
    
    # Create state manager
    state_manager = ADKStateManager(session)
    
    # Set workflow status
    workflow_id = "wf_123"
    state_manager.set_workflow_status(workflow_id, WorkflowStatus.PROCESSING)
    
    # Update workflow context
    state_manager.update_workflow_context(workflow_id, {
        "agent": "orchestrator",
        "task": "process_request"
    })
    
    # Set user preference (persists across sessions)
    state_manager.set_user_preference("theme", "dark")
    state_manager.set_user_preference("language", "en")
    
    # Set app config (global)
    state_manager.set_app_config("api_endpoint", "https://api.vana.ai")
    state_manager.set_app_config("rate_limit", 1000)
    
    # Set temporary data (not persisted)
    state_manager.set_temp_data("processing_id", "tmp_456")
    
    # Add workflow transition
    state_manager.add_workflow_transition(
        workflow_id,
        WorkflowStatus.PROCESSING.value,
        WorkflowStatus.REVIEW.value,
        {"reason": "requires_approval"}
    )
    
    # Get progress
    progress = state_manager.get_workflow_progress(workflow_id)
    print(f"Workflow Progress: {progress}")
    
    # In production with VertexAiSessionService, all non-temp data
    # would be automatically persisted!
"""
Unit tests for ADK State Manager
"""

import asyncio
from datetime import datetime
from google.adk.sessions import InMemorySessionService
from lib.workflows.adk_state_manager import ADKStateManager, WorkflowStatus


async def test_basic_functionality():
    """Test basic state manager operations"""
    
    # Create session
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name="test_app",
        user_id="test_user",
        session_id="test_session"
    )
    
    # Create state manager
    state_manager = ADKStateManager(session)
    
    # Test workflow status operations
    workflow_id = "test_workflow_123"
    
    # Initially should be None
    status = state_manager.get_workflow_status(workflow_id)
    assert status is None, f"Expected None, got {status}"
    
    # Set status
    state_manager.set_workflow_status(workflow_id, WorkflowStatus.PROCESSING)
    
    # Verify status was set
    status = state_manager.get_workflow_status(workflow_id)
    assert status == WorkflowStatus.PROCESSING, f"Expected PROCESSING, got {status}"
    
    # Verify timestamp was set
    updated_at = session.state.get(f"workflow:{workflow_id}:updated_at")
    assert updated_at is not None, "Updated timestamp not set"
    
    # Test context operations
    context = state_manager.get_workflow_context(workflow_id)
    assert context == {}, f"Expected empty dict, got {context}"
    
    # Update context
    state_manager.update_workflow_context(workflow_id, {
        "agent": "test_agent",
        "task": "test_task",
        "attempt": 1
    })
    
    # Verify context
    context = state_manager.get_workflow_context(workflow_id)
    assert context["agent"] == "test_agent"
    assert context["task"] == "test_task"
    assert context["attempt"] == 1
    
    # Update again
    state_manager.update_workflow_context(workflow_id, {
        "attempt": 2,
        "error": None
    })
    
    # Verify merge
    context = state_manager.get_workflow_context(workflow_id)
    assert context["attempt"] == 2
    assert context["error"] is None
    assert context["agent"] == "test_agent"  # Original value preserved
    
    print("✅ All basic tests passed!")
    
    # Show final state
    print("\nFinal session state:")
    for key, value in session.state.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(test_basic_functionality())
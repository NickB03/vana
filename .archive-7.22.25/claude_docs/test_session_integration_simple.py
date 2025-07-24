"""
Simplified integration test for ADK State Manager with Session Services
"""

import asyncio
from google.adk.sessions import InMemorySessionService
from lib.workflows.adk_state_manager import ADKStateManager, WorkflowStatus


async def test_session_integration():
    """Test ADK state manager with session services"""
    
    print("🧪 ADK State Manager - Session Integration Test")
    print("=" * 60)
    
    # Create session service
    session_service = InMemorySessionService()
    app_name = "vana_test"
    
    # Test 1: Create session and use state manager
    print("\n1️⃣ Testing session creation and state management...")
    session = await session_service.create_session(
        app_name=app_name,
        user_id="user1",
        session_id="session1"
    )
    
    # Create state manager
    state_mgr = ADKStateManager(session)
    
    # Set various state types
    # Session-specific workflow state
    state_mgr.set_workflow_status("wf_001", WorkflowStatus.PROCESSING)
    state_mgr.update_workflow_context("wf_001", {
        "task": "analyze_data",
        "progress": 25
    })
    
    # User preferences (would persist across sessions with VertexAI)
    state_mgr.set_user_preference("theme", "dark")
    state_mgr.set_user_preference("language", "en")
    
    # App config (global settings)
    state_mgr.set_app_config("api_version", "v2")
    state_mgr.set_app_config("feature_flags", {"new_ui": True})
    
    # Temp data (never persisted)
    state_mgr.set_temp_data("cache_key", "temp_123")
    
    print("✅ State set successfully")
    
    # Verify state
    assert state_mgr.get_workflow_status("wf_001") == WorkflowStatus.PROCESSING
    assert state_mgr.get_user_preference("theme") == "dark"
    assert state_mgr.get_app_config("api_version") == "v2"
    assert state_mgr.get_temp_data("cache_key") == "temp_123"
    
    # Show current state
    print("\n📋 Current session state:")
    for key in sorted(session.state.keys()):
        print(f"  {key}: {session.state[key]}")
    
    # Test 2: Demonstrate prefix behavior
    print("\n2️⃣ Testing state prefix behavior...")
    
    # Clear temp data
    state_mgr.clear_temp_data()
    
    # Verify temp cleared but others remain
    assert state_mgr.get_temp_data("cache_key") is None
    assert state_mgr.get_user_preference("theme") == "dark"  # Still there
    
    print("✅ Temp data cleared, other prefixes preserved")
    
    # Test 3: Update workflow to complete
    print("\n3️⃣ Testing workflow state transitions...")
    state_mgr.set_workflow_status("wf_001", WorkflowStatus.COMPLETE)
    state_mgr.update_workflow_context("wf_001", {"progress": 100})
    
    assert state_mgr.get_workflow_status("wf_001") == WorkflowStatus.COMPLETE
    assert state_mgr.get_workflow_context("wf_001")["progress"] == 100
    
    print("✅ Workflow state updated successfully")
    
    # Summary
    print("\n📊 Integration Test Summary:")
    print("✅ ADK state manager works with session.state")
    print("✅ All prefix types (none, user:, app:, temp:) functioning")
    print("✅ State changes reflected immediately in session")
    
    print("\n🚀 Key Differences with VertexAiSessionService:")
    print("1. InMemorySessionService:")
    print("   - State only exists in memory")
    print("   - Lost on application restart")
    print("   - Prefixes stored but not persisted differently")
    print("   - Good for development/testing")
    print("\n2. VertexAiSessionService (Production):")
    print("   - State persisted to Vertex AI")
    print("   - Survives application restarts")
    print("   - user: prefix shared across user's sessions")
    print("   - app: prefix shared globally")
    print("   - temp: prefix never persisted")
    print("   - Automatic persistence on append_event()")
    
    return True


if __name__ == "__main__":
    asyncio.run(test_session_integration())
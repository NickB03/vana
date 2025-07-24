"""
Test ADK State Manager Prefix Functionality
"""

import asyncio
from google.adk.sessions import InMemorySessionService
from lib.workflows.adk_state_manager import ADKStateManager


async def test_state_prefixes():
    """Test state prefix functionality"""
    
    # Create session
    session_service = InMemorySessionService()
    session = await session_service.create_session(
        app_name="test_app",
        user_id="test_user",
        session_id="test_session"
    )
    
    # Create state manager
    state_manager = ADKStateManager(session)
    
    print("Testing state prefixes...")
    
    # Test user preferences (user: prefix)
    state_manager.set_user_preference("theme", "dark")
    state_manager.set_user_preference("language", "en")
    state_manager.set_user_preference("notifications", True)
    
    assert state_manager.get_user_preference("theme") == "dark"
    assert state_manager.get_user_preference("language") == "en"
    assert state_manager.get_user_preference("notifications") == True
    assert state_manager.get_user_preference("missing", "default") == "default"
    print("✅ User preferences working")
    
    # Test app config (app: prefix)
    state_manager.set_app_config("api_endpoint", "https://api.vana.ai")
    state_manager.set_app_config("rate_limit", 1000)
    state_manager.set_app_config("maintenance_mode", False)
    
    assert state_manager.get_app_config("api_endpoint") == "https://api.vana.ai"
    assert state_manager.get_app_config("rate_limit") == 1000
    assert state_manager.get_app_config("maintenance_mode") == False
    assert state_manager.get_app_config("missing", None) is None
    print("✅ App config working")
    
    # Test temporary data (temp: prefix)
    state_manager.set_temp_data("processing_id", "temp_123")
    state_manager.set_temp_data("cache_data", {"items": [1, 2, 3]})
    state_manager.set_temp_data("debug_flag", True)
    
    assert state_manager.get_temp_data("processing_id") == "temp_123"
    assert state_manager.get_temp_data("cache_data") == {"items": [1, 2, 3]}
    assert state_manager.get_temp_data("debug_flag") == True
    print("✅ Temporary data working")
    
    # Show state before clearing temp
    print("\nState before clearing temp:")
    temp_count = 0
    for key in sorted(session.state.keys()):
        if key.startswith("temp:"):
            temp_count += 1
        print(f"  {key}: {session.state[key]}")
    
    # Clear temp data
    state_manager.clear_temp_data()
    
    # Verify temp data cleared but others remain
    assert state_manager.get_temp_data("processing_id") is None
    assert state_manager.get_user_preference("theme") == "dark"  # Still there
    assert state_manager.get_app_config("api_endpoint") == "https://api.vana.ai"  # Still there
    print(f"\n✅ Cleared {temp_count} temp items")
    
    # Show final state
    print("\nFinal state after clearing temp:")
    for key in sorted(session.state.keys()):
        print(f"  {key}: {session.state[key]}")
    
    print("\n✅ All prefix tests passed!")
    
    # Demonstrate ADK persistence behavior
    print("\n📝 ADK Persistence Behavior:")
    print("- No prefix: Persisted with session (session-specific)")
    print("- user: prefix: Persisted across sessions for same user")
    print("- app: prefix: Persisted globally for all users")
    print("- temp: prefix: NEVER persisted, cleared each request")


if __name__ == "__main__":
    asyncio.run(test_state_prefixes())
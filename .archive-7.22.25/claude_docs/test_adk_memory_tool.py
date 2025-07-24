"""
Test the ADK memory tool functionality
"""

import sys
sys.path.append('/Users/nick/Development/vana')

from lib._tools.adk_memory_tool import (
    save_user_memory,
    save_detected_memory,
    retrieve_user_memory,
    search_user_memories,
    list_all_user_memories,
    clear_user_memory,
    get_user_context_summary
)
from lib._tools.memory_detection_patterns import DetectedMemory, MemoryType

# Mock ToolContext for testing
class MockToolContext:
    """Mock ToolContext for testing without full ADK setup"""
    def __init__(self):
        self.state = {}
        self.invocation_id = "test-invocation-123"
        self.agent_name = "test_agent"

def test_memory_tool():
    """Test the memory tool functions"""
    print("🧠 Testing ADK Memory Tool\n")
    print("=" * 60)
    
    # Create mock context
    tool_context = MockToolContext()
    
    # Test 1: Save user memory
    print("\n📝 Test 1: Save User Memory")
    result = save_user_memory(
        key="name",
        value="Nick",
        context="User introduced themselves",
        tool_context=tool_context
    )
    print(f"Result: {result}")
    print(f"State after save: {tool_context.state}")
    
    # Test 2: Save detected memory
    print("\n\n📝 Test 2: Save Detected Memory")
    detected_mem = DetectedMemory(
        key="occupation",
        value="software engineer",
        memory_type=MemoryType.USER_IDENTITY,
        importance_score=0.8,
        context="User mentioned their job"
    )
    result = save_detected_memory(detected_mem, tool_context)
    print(f"Result: {result}")
    
    # Test 3: Retrieve memory
    print("\n\n📝 Test 3: Retrieve Memory")
    result = retrieve_user_memory("name", tool_context)
    print(f"Retrieved 'name': {result}")
    
    result = retrieve_user_memory("nonexistent", tool_context)
    print(f"Retrieved 'nonexistent': {result}")
    
    # Test 4: Save list-type memories
    print("\n\n📝 Test 4: Save List-Type Memories")
    likes_mem1 = DetectedMemory(
        key="likes",
        value="hiking",
        memory_type=MemoryType.USER_PREFERENCE,
        importance_score=0.6
    )
    likes_mem2 = DetectedMemory(
        key="likes",
        value="reading",
        memory_type=MemoryType.USER_PREFERENCE,
        importance_score=0.6
    )
    
    save_detected_memory(likes_mem1, tool_context)
    save_detected_memory(likes_mem2, tool_context)
    
    result = retrieve_user_memory("likes", tool_context)
    print(f"Retrieved 'likes' (should be list): {result}")
    
    # Test 5: Search memories
    print("\n\n📝 Test 5: Search Memories")
    result = search_user_memories("engineer", tool_context)
    print(f"Search for 'engineer': {result}")
    
    result = search_user_memories("nick", tool_context)
    print(f"Search for 'nick': {result}")
    
    # Test 6: List all memories
    print("\n\n📝 Test 6: List All Memories")
    result = list_all_user_memories(tool_context)
    print(f"All memories: {result}")
    
    # Test 7: Get user context summary
    print("\n\n📝 Test 7: User Context Summary")
    summary = get_user_context_summary(tool_context)
    print(f"Summary: {summary}")
    
    # Test 8: Clear memory
    print("\n\n📝 Test 8: Clear Memory")
    result = clear_user_memory("occupation", tool_context)
    print(f"Clear 'occupation': {result}")
    
    result = list_all_user_memories(tool_context)
    print(f"Memories after clear: {result}")
    
    # Test 9: Key scenario - Save and retrieve name
    print("\n\n🔑 Test 9: Key Scenario - Cross-Session Memory")
    print("Simulating: 'My name is Nick'")
    
    # Clear state to simulate new session
    tool_context.state = {}
    
    # Session 1: Save name
    save_user_memory("name", "Nick", "User introduction", tool_context)
    print(f"Session 1 state: {tool_context.state}")
    
    # Simulate session persistence (in real ADK, this would be handled by SessionService)
    saved_state = tool_context.state.copy()
    
    # Session 2: New context but with persisted state
    tool_context2 = MockToolContext()
    tool_context2.state = saved_state
    
    print("\nSession 2: 'Do you know my name?'")
    result = retrieve_user_memory("name", tool_context2)
    print(f"Retrieved from session 2: {result}")
    
    if result.get("value") == "Nick":
        print("✅ Cross-session memory working correctly!")
    else:
        print("❌ Cross-session memory failed")
    
    print("\n" + "=" * 60)
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    test_memory_tool()
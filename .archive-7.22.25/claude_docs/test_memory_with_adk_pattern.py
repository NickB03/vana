"""
Test memory tool with ADK function pattern
"""

import sys
sys.path.append('/Users/nick/Development/vana')

from google.adk.tools import ToolContext
from lib._tools.adk_memory_tool import save_user_memory, retrieve_user_memory
from lib._tools.memory_detection_patterns import create_memory_detector

# These functions follow ADK tool pattern - they would be wrapped by FunctionTool
def remember_user_name(name: str, tool_context: ToolContext) -> dict:
    """
    Remember the user's name for future sessions.
    
    This tool saves the user's name with cross-session persistence.
    
    Args:
        name: The user's name to remember
        tool_context: ADK ToolContext for state access
        
    Returns:
        Confirmation of saved memory
    """
    result = save_user_memory(
        key="name",
        value=name,
        context="User provided their name",
        tool_context=tool_context
    )
    
    if result.get("status") == "success":
        return {
            "message": f"I'll remember that your name is {name}.",
            "saved": True
        }
    else:
        return {
            "message": "I had trouble remembering that.",
            "saved": False,
            "error": result.get("error")
        }


def recall_user_name(tool_context: ToolContext) -> dict:
    """
    Recall the user's name from memory.
    
    This tool retrieves the user's name from cross-session storage.
    
    Args:
        tool_context: ADK ToolContext for state access
        
    Returns:
        The user's name if known
    """
    result = retrieve_user_memory("name", tool_context)
    
    if result.get("status") == "success":
        name = result.get("value")
        return {
            "message": f"Yes, I remember you! Your name is {name}.",
            "name": name,
            "found": True
        }
    else:
        return {
            "message": "I don't have your name in my memory yet. What should I call you?",
            "found": False
        }


def detect_and_save_memories(text: str, tool_context: ToolContext) -> dict:
    """
    Automatically detect and save important information from text.
    
    This tool uses memory detection patterns to find and save memories.
    
    Args:
        text: The text to analyze for memorable information
        tool_context: ADK ToolContext for state access
        
    Returns:
        Summary of detected and saved memories
    """
    from lib._tools.adk_memory_tool import save_detected_memory
    
    # Create detector
    detector = create_memory_detector()
    
    # Detect memories
    memories = detector.detect_memories(text)
    
    saved_memories = []
    for memory in memories:
        # Only save important memories (threshold 0.6)
        if memory.importance_score >= 0.6:
            result = save_detected_memory(memory, tool_context)
            if result.get("status") == "success":
                saved_memories.append({
                    "type": memory.memory_type.value,
                    "key": memory.key,
                    "value": memory.value,
                    "importance": memory.importance_score
                })
    
    if saved_memories:
        return {
            "message": f"I detected and saved {len(saved_memories)} important facts.",
            "memories": saved_memories,
            "success": True
        }
    else:
        return {
            "message": "I didn't detect any important information to remember.",
            "memories": [],
            "success": True
        }


# Test the ADK pattern
def test_adk_pattern():
    """Test the memory tools with ADK pattern"""
    print("🔧 Testing Memory Tools with ADK Pattern\n")
    print("=" * 60)
    
    # Mock ToolContext
    class MockToolContext:
        def __init__(self):
            self.state = {}
    
    # Test scenario
    print("\n📍 Scenario: User introduces themselves")
    tool_context = MockToolContext()
    
    # Simulate agent detecting "My name is Nick"
    user_input = "Hi there! My name is Nick and I'm a software engineer working on AI projects."
    print(f"User: '{user_input}'")
    
    # Tool 1: Detect and save memories automatically
    print("\n🤖 Agent uses detect_and_save_memories tool...")
    result = detect_and_save_memories(user_input, tool_context)
    print(f"Result: {result}")
    
    # Show what was saved
    print(f"\nState after detection: {tool_context.state}")
    
    # Simulate new session
    print("\n\n📍 New Session: User asks if agent remembers")
    tool_context2 = MockToolContext()
    tool_context2.state = tool_context.state.copy()  # Simulate state persistence
    
    print("User: 'Do you remember my name?'")
    
    # Tool 2: Recall user name
    print("\n🤖 Agent uses recall_user_name tool...")
    result = recall_user_name(tool_context2)
    print(f"Result: {result}")
    
    # Alternative: Direct save
    print("\n\n📍 Alternative: Direct name save")
    tool_context3 = MockToolContext()
    
    print("User: 'Call me Nicholas'")
    print("\n🤖 Agent uses remember_user_name tool...")
    result = remember_user_name("Nicholas", tool_context3)
    print(f"Result: {result}")
    
    print("\n" + "=" * 60)
    print("\n✅ ADK pattern test completed!")
    print("\n📝 Summary:")
    print("- Memory tools follow ADK FunctionTool pattern")
    print("- Accept ToolContext as parameter")
    print("- Use tool_context.state with user: prefix")
    print("- Return structured dictionaries")
    print("- Ready for integration with agents")


if __name__ == "__main__":
    test_adk_pattern()
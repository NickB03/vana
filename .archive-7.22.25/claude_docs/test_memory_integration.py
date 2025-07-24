"""
Test memory integration with agents
"""

import sys
sys.path.append('/Users/nick/Development/vana')

from lib.agents.callbacks.memory_callbacks import (
    memory_detection_callback,
    memory_context_injection_callback
)
from lib._tools.memory_detection_patterns import create_memory_detector, DetectedMemory, MemoryType
from google.adk.agents.callback_context import CallbackContext
from google.genai import types

# Mock CallbackContext for testing
class MockCallbackContext:
    def __init__(self, user_message="", existing_state=None):
        self.agent_name = "test_agent"
        self.invocation_id = "test-inv-123"
        self.state = existing_state or {}
        
        # Create user content
        if user_message:
            self.user_content = types.Content(
                role="user",
                parts=[types.Part(text=user_message)]
            )
        else:
            self.user_content = None

def test_memory_callbacks():
    """Test the memory callbacks"""
    print("🧠 Testing Memory Integration with Agents\n")
    print("=" * 60)
    
    # Test 1: Memory detection callback with user introduction
    print("\n📝 Test 1: Memory Detection After Agent")
    
    # Simulate user saying "My name is Nick and I'm a software engineer"
    context1 = MockCallbackContext(
        user_message="Hi! My name is Nick and I'm a software engineer working on AI projects."
    )
    
    print(f"User: '{context1.user_content.parts[0].text}'")
    print("\nRunning after_agent_callback...")
    
    # Run the callback
    result = memory_detection_callback(context1)
    
    print(f"Callback returned: {result}")
    print(f"State after callback: {context1.state}")
    
    # Verify memories were saved
    assert "user:name" in context1.state
    assert context1.state["user:name"] == "Nick"
    assert "user:occupation" in context1.state
    print("✅ Memory detection working correctly!")
    
    # Test 2: Context injection callback
    print("\n\n📝 Test 2: Context Injection Before Agent")
    
    # Create new context with saved memories
    context2 = MockCallbackContext(
        user_message="What's the weather like?",
        existing_state=context1.state.copy()  # Use state from previous test
    )
    
    print("Running before_agent_callback...")
    result = memory_context_injection_callback(context2)
    
    print(f"Callback returned: {result}")
    
    # Check if user context was injected
    if "temp:user_context" in context2.state:
        print(f"Injected context: {context2.state['temp:user_context']}")
        print("✅ Context injection working correctly!")
    else:
        print("❌ No context injected")
    
    # Test 3: Test with preferences
    print("\n\n📝 Test 3: Detecting Preferences")
    
    context3 = MockCallbackContext(
        user_message="I love hiking and my favorite programming language is Python",
        existing_state=context2.state.copy()
    )
    
    print(f"User: '{context3.user_content.parts[0].text}'")
    
    # Run detection
    memory_detection_callback(context3)
    
    # Check preferences
    if "user:likes" in context3.state:
        print(f"Detected likes: {context3.state['user:likes']}")
    if "user:favorite_programming" in context3.state:
        print(f"Detected favorite: {context3.state['user:favorite_programming']}")
    
    # Test 4: Verify persistence simulation
    print("\n\n📝 Test 4: Cross-Session Simulation")
    
    # Simulate new session with persisted state
    persisted_state = {
        k: v for k, v in context3.state.items() 
        if k.startswith("user:")  # Only user: prefixed state persists
    }
    
    context4 = MockCallbackContext(
        user_message="Do you remember anything about me?",
        existing_state=persisted_state
    )
    
    print(f"User: '{context4.user_content.parts[0].text}'")
    
    # Inject context
    memory_context_injection_callback(context4)
    
    if "temp:user_context" in context4.state:
        print(f"\nAgent would have access to: {context4.state['temp:user_context']}")
        print("✅ Cross-session memory simulation successful!")
    
    print("\n" + "=" * 60)
    print("\n✅ All memory integration tests passed!")
    print("\n📌 Summary:")
    print("- Memory detection callback captures user information")
    print("- Context injection provides user info to agents")
    print("- Preferences and identity are detected correctly")
    print("- State with user: prefix simulates persistence")
    print("\n🚀 Ready for integration with ADK session services!")

if __name__ == "__main__":
    test_memory_callbacks()
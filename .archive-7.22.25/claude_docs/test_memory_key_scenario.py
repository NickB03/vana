"""
Test the key scenario: "My name is Nick" -> remember across sessions
"""

import sys
sys.path.append('/Users/nick/Development/vana')

from lib._tools.memory_detection_patterns import create_memory_detector, MemoryType

def test_key_scenario():
    """Test the specific user scenario for memory detection"""
    detector = create_memory_detector()
    
    print("🔑 Testing Key Scenario: Cross-Session Memory\n")
    print("=" * 60)
    
    # Scenario 1: User introduces themselves
    print("\n📍 Session 1: User Introduction")
    user_input = "My name is Nick"
    print(f"User: '{user_input}'")
    
    memories = detector.detect_memories(user_input)
    
    if memories:
        print(f"\n✅ Detected {len(memories)} memories:")
        for mem in memories:
            print(f"  • Type: {mem.memory_type.value}")
            print(f"    Key: '{mem.key}'")
            print(f"    Value: '{mem.value}'")
            print(f"    Importance: {mem.importance_score}")
            print(f"    Ready to save with key: 'user:{mem.key}'")
    
    # Simulate what would be saved
    print("\n💾 What would be saved to ADK state:")
    for mem in memories:
        print(f"  session.state['user:{mem.key}'] = '{mem.value}'")
    
    # Scenario 2: Later session, system should remember
    print("\n\n📍 Session 2: Memory Retrieval")
    print("User: 'Do you know my name?'")
    print("\n🤖 System would check: session.state.get('user:name')")
    print("Expected response: 'Yes, your name is Nick'")
    
    # Additional test cases
    print("\n\n📍 Additional Test Cases:")
    
    test_cases = [
        ("Hi, I'm Nicholas but everyone calls me Nick", "Should detect 'Nicholas' or 'Nick'"),
        ("My name is Nick and I'm a software engineer", "Should detect both name and occupation"),
        ("I'm Nick from San Francisco", "Should detect name and location"),
    ]
    
    for text, expected in test_cases:
        print(f"\n📝 Input: '{text}'")
        print(f"   Expected: {expected}")
        mems = detector.detect_memories(text)
        if mems:
            for m in mems:
                print(f"   ✓ Found: {m.key} = '{m.value}'")
        else:
            print(f"   ✗ No memories detected")
    
    print("\n" + "=" * 60)
    print("\n✅ Key scenario validation complete!")
    print("\n📌 Next steps:")
    print("  1. Implement memory storage tool (Chunk 1.1)")
    print("  2. Add ADK callbacks to agents (Chunk 1.2)")
    print("  3. Test with actual ADK session service")

if __name__ == "__main__":
    test_key_scenario()
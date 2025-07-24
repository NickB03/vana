"""
Test script for memory detection patterns
"""

import sys
sys.path.append('/Users/nick/Development/vana')

from lib._tools.memory_detection_patterns import create_memory_detector, MemoryType

def test_memory_detection():
    """Test the memory detection patterns"""
    detector = create_memory_detector()
    
    # Test cases
    test_texts = [
        "My name is Nick",
        "I'm a software engineer",
        "I live in San Francisco",
        "I love hiking and my favorite color is blue",
        "I want to build an AI assistant",
        "I don't like spicy food",
        "Call me Nicholas",
        "I go by Nick",
        "I'm trying to learn machine learning",
        "I'm Nick",
        "I'm working on a project",
    ]
    
    print("🧠 Testing Memory Detection Patterns\n")
    print("=" * 60)
    
    for text in test_texts:
        print(f"\n📝 Text: '{text}'")
        memories = detector.detect_memories(text)
        
        if memories:
            print(f"✅ Found {len(memories)} memories:")
            for mem in memories:
                print(f"  • {mem.memory_type.value}: {mem.key} = '{mem.value}'")
                print(f"    Importance: {mem.importance_score:.2f}, Context: {mem.context}")
        else:
            print("❌ No memories detected")
    
    # Test importance filtering
    print("\n" + "=" * 60)
    print("\n🎯 Testing Importance Filtering (threshold=0.6)\n")
    
    combined_text = "My name is Nick and I'm from New York. I have a cat."
    all_memories = detector.detect_memories(combined_text)
    important_memories = detector.filter_memories(all_memories, threshold=0.6)
    
    print(f"All memories: {len(all_memories)}")
    print(f"Important memories (>0.6): {len(important_memories)}")
    for mem in important_memories:
        print(f"  • {mem.key} = '{mem.value}' (score: {mem.importance_score:.2f})")
    
    # Debug the specific issue
    print("\n🔍 Debugging combined text memories:")
    for mem in all_memories:
        print(f"  • Type: {mem.memory_type.value}, Key: {mem.key}, Value: '{mem.value}'")
    
    print("\n✅ Test completed!")

if __name__ == "__main__":
    test_memory_detection()
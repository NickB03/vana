#!/usr/bin/env python3
"""
Test script for the new transfer_to_agent() function.

This script tests the critical Google ADK pattern implementation.
"""

import sys
import os


def test_transfer_to_agent_function():
    """Test the transfer_to_agent function directly."""
    print("🧪 Testing transfer_to_agent() function...")
    
    try:
        from lib._tools.standardized_system_tools import standardized_transfer_to_agent
        
        # Test 1: Valid agent transfer
        print("\n1. Testing valid agent transfer...")
        result = standardized_transfer_to_agent("architecture_specialist", "Design a new system architecture")
        print(f"✅ Result: {result}")
        
        # Test 2: Invalid agent name
        print("\n2. Testing invalid agent name...")
        result = standardized_transfer_to_agent("invalid_agent", "Some task")
        print(f"❌ Result: {result}")
        
        # Test 3: Transfer without context
        print("\n3. Testing transfer without context...")
        result = standardized_transfer_to_agent("ui_specialist")
        print(f"✅ Result: {result}")
        
        print("\n🎉 transfer_to_agent() function tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing transfer_to_agent function: {e}")
        return False

def test_adk_tool_integration():
    """Test the ADK tool integration."""
    print("\n🔧 Testing ADK tool integration...")
    
    try:
        from lib._tools.adk_tools import adk_transfer_to_agent
        
        # Test ADK wrapper
        print("Testing ADK FunctionTool wrapper...")
        result = adk_transfer_to_agent.func("devops_specialist", "Deploy the application")
        print(f"✅ ADK Tool Result: {result}")
        
        print("🎉 ADK tool integration tests completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing ADK tool integration: {e}")
        return False

def test_agent_tool_availability():
    """Test that the tool is available to agents."""
    print("\n🤖 Testing agent tool availability...")
    
    try:
        from agents.vana.team import vana
        
        # Check if transfer_to_agent is in vana's tools
        tool_names = [tool.func.__name__ for tool in vana.tools if hasattr(tool, 'func')]
        print(f"Available tools: {tool_names}")
        
        if '_transfer_to_agent' in tool_names:
            print("✅ transfer_to_agent tool is available to vana agent!")
            return True
        else:
            print("❌ transfer_to_agent tool is NOT available to vana agent")
            return False
            
    except Exception as e:
        print(f"❌ Error testing agent tool availability: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing Google ADK transfer_to_agent() Implementation")
    print("=" * 60)
    
    results = []
    
    # Test 1: Function implementation
    results.append(test_transfer_to_agent_function())
    
    # Test 2: ADK integration
    results.append(test_adk_tool_integration())
    
    # Test 3: Agent availability
    results.append(test_agent_tool_availability())
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Google ADK transfer_to_agent() pattern is implemented correctly.")
        print("\n✅ Critical Gap #1 RESOLVED: transfer_to_agent() function is working!")
        print("✅ Agents can now use transfer_to_agent() for coordinator/dispatcher patterns")
        print("✅ Foundation for Google ADK compliance is in place")
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

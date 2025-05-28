#!/usr/bin/env python3
"""
Test tool configuration without requiring API calls
"""

def test_tool_configuration():
    """Test that tools are properly configured"""
    try:
        # Import the root agent
        from agent import root_agent
        
        print("✅ Successfully imported root_agent")
        print(f"Agent name: {root_agent.name}")
        print(f"Number of tools: {len(root_agent.tools)}")
        
        # Test each tool
        for i, tool in enumerate(root_agent.tools):
            print(f"\nTool {i+1}:")
            print(f"  Type: {type(tool).__name__}")
            print(f"  Has __name__: {hasattr(tool, '__name__')}")
            if hasattr(tool, '__name__'):
                print(f"  Name: {tool.__name__}")
            
            # Test if we can call the underlying function
            if hasattr(tool, 'func'):
                func = tool.func
                print(f"  Function name: {func.__name__}")
                
                # Test echo tool
                if func.__name__ == 'echo_tool':
                    result = func("test message")
                    print(f"  Test result: {result}")
                
                # Test system info tool
                elif func.__name__ == 'get_system_info':
                    result = func()
                    print(f"  Test result: {result}")
        
        print("\n✅ All tool configuration tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 Testing tool configuration...")
    success = test_tool_configuration()
    print(f"\n{'✅ SUCCESS' if success else '❌ FAILED'}")

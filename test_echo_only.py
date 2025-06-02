#!/usr/bin/env python3
"""
Test importing just the echo function from adk_tools
"""

print("Testing echo function import...")

try:
    print("1. Testing direct function import...")
    from lib._tools.adk_tools import echo
    print("✅ Echo function imported successfully")
    
    print("2. Testing function execution...")
    result = echo("test message")
    print(f"✅ Echo function executed: {result}")
    
    print("3. Testing FunctionTool import...")
    from lib._tools.adk_tools import adk_echo
    print("✅ Echo FunctionTool imported successfully")
    
    print("4. Testing FunctionTool execution...")
    result2 = adk_echo.func("test message 2")
    print(f"✅ Echo FunctionTool executed: {result2}")
    
    print("🎉 Echo tests passed!")
    
except Exception as e:
    print(f"❌ Echo test failed: {e}")
    import traceback
    traceback.print_exc()

#!/usr/bin/env python3
"""
Minimal test to isolate the hanging import issue
"""

print("Starting minimal import test...")

try:
    print("1. Testing basic imports...")
    import json
    import logging
    import os
    print("✅ Basic imports successful")
    
    print("2. Testing Google ADK import...")
    from google.adk.tools import FunctionTool
    print("✅ Google ADK import successful")
    
    print("3. Testing simple function...")
    def test_echo(message: str) -> str:
        return f"Echo: {message}"
    print("✅ Function definition successful")
    
    print("4. Testing FunctionTool creation...")
    test_tool = FunctionTool(func=test_echo)
    print("✅ FunctionTool creation successful")
    
    print("5. Testing tool name assignment...")
    test_tool.name = "test_echo"
    print("✅ Tool name assignment successful")
    
    print("6. Testing tool execution...")
    result = test_tool.func("Hello World")
    print(f"✅ Tool execution successful: {result}")
    
    print("🎉 All tests passed!")
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()

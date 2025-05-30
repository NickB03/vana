#!/usr/bin/env python3
"""
Minimal test to isolate Google ADK import hanging issue
"""

print("=== Minimal ADK Test ===")

print("1. Setting minimal environment...")
import os
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "False"  # Try without Vertex AI first
print("✅ Environment set to use Google AI Studio")

print("2. Testing Google ADK import...")
try:
    from google.adk.tools import FunctionTool
    print("✅ Google ADK imported successfully")
except Exception as e:
    print(f"❌ Google ADK import failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("3. Testing FunctionTool creation...")
try:
    def test_func(msg: str) -> str:
        return f"Test: {msg}"
    
    tool = FunctionTool(func=test_func)
    print("✅ FunctionTool created successfully")
except Exception as e:
    print(f"❌ FunctionTool creation failed: {e}")
    import traceback
    traceback.print_exc()

print("=== Test Complete ===")

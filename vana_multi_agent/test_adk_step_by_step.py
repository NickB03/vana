#!/usr/bin/env python3
"""
Step-by-step test to isolate exactly where Google ADK hangs
"""

print("=== Step-by-Step ADK Test ===")

print("1. Testing basic google import...")
try:
    import google
    print("✅ google package imported")
except Exception as e:
    print(f"❌ google package failed: {e}")
    exit(1)

print("2. Testing google.adk import...")
try:
    import google.adk
    print("✅ google.adk imported")
except Exception as e:
    print(f"❌ google.adk failed: {e}")
    exit(1)

print("3. Testing google.adk.tools import...")
try:
    import google.adk.tools
    print("✅ google.adk.tools imported")
except Exception as e:
    print(f"❌ google.adk.tools failed: {e}")
    exit(1)

print("4. Testing FunctionTool import...")
try:
    from google.adk.tools import FunctionTool
    print("✅ FunctionTool imported")
except Exception as e:
    print(f"❌ FunctionTool import failed: {e}")
    exit(1)

print("=== All imports successful ===")

#!/usr/bin/env python3
"""
Debug script to isolate the import hanging issue
"""

print("=== Import Debug Script ===")

print("1. Testing basic imports...")
import os
import json
import logging
print("✅ Basic imports successful")

print("2. Testing typing imports...")
from typing import Dict, Any, List, Optional
print("✅ Typing imports successful")

print("3. Testing Google ADK import...")
try:
    from google.adk.tools import FunctionTool
    print("✅ Google ADK import successful")
except Exception as e:
    print(f"❌ Google ADK import failed: {e}")
    exit(1)

print("4. Testing individual tool functions...")
try:
    # Test importing just the function definitions without FunctionTool wrappers
    import sys
    sys.path.insert(0, '.')
    
    # Create a minimal version of our tool functions
    def test_echo(message: str) -> str:
        return f"Echo: {message}"
    
    print("✅ Function definitions successful")
    
    # Test creating FunctionTool
    test_tool = FunctionTool(func=test_echo)
    print("✅ FunctionTool creation successful")
    
except Exception as e:
    print(f"❌ Tool function test failed: {e}")
    import traceback
    traceback.print_exc()

print("=== Debug Complete ===")

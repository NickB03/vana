#!/usr/bin/env python3
"""
Test Google ADK with Google AI Studio instead of Vertex AI
"""

print("=== Testing Google ADK with Google AI Studio ===")

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
print("✅ Environment loaded")

# Override to use Google AI Studio instead of Vertex AI
os.environ["GOOGLE_GENAI_USE_VERTEXAI"] = "FALSE"
print("✅ Set to use Google AI Studio")

# Check if we have the required API key
google_api_key = os.getenv("GOOGLE_API_KEY")
if google_api_key:
    print("✅ Google API Key found")
else:
    print("❌ Google API Key not found - this might be the issue")
    print("Available environment variables:")
    for key, value in os.environ.items():
        if 'GOOGLE' in key:
            print(f"  {key}={value[:20]}..." if len(value) > 20 else f"  {key}={value}")

print("\nTesting Google ADK import...")
try:
    from google.adk.tools import FunctionTool
    print("✅ Google ADK imported successfully!")
    
    # Test creating a simple function tool
    def test_function(message: str) -> str:
        return f"Test: {message}"
    
    tool = FunctionTool(func=test_function)
    print("✅ FunctionTool created successfully!")
    
except Exception as e:
    print(f"❌ Google ADK import/usage failed: {e}")
    import traceback
    traceback.print_exc()

print("=== Test Complete ===")

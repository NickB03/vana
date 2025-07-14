#!/usr/bin/env python3
"""Debug function call issues with Gemini and ADK tools"""

import os
import sys

from dotenv import load_dotenv

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path, override=True)

import google.generativeai as genai
from google.adk.tools import FunctionTool

# Configure genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Import the fixed web search tool
from lib._tools.fixed_web_search import create_fixed_web_search_tool


def test_adk_tool_format():
    """Test ADK FunctionTool format"""
    
    # Get the fixed web search tool
    fixed_tool = create_fixed_web_search_tool()
    
    print("🔍 Examining Fixed Web Search Tool:")
    print(f"   Name: {fixed_tool.name}")
    print(f"   Description: {fixed_tool.description}")
    print(f"   Parameters: {fixed_tool.parameters}")
    print(f"   Function: {fixed_tool.func}")
    print(f"   Function signature: {fixed_tool.func.__name__}")
    
    # Check the actual function
    import inspect
    sig = inspect.signature(fixed_tool.func)
    print(f"\n📝 Function Signature:")
    print(f"   {fixed_tool.func.__name__}{sig}")
    
    # Test calling the function directly
    print("\n🧪 Testing direct function call:")
    try:
        result = fixed_tool.func("test query", 5)
        print(f"   ✅ Direct call successful")
        print(f"   Result type: {type(result)}")
        print(f"   Result preview: {result[:100]}...")
    except Exception as e:
        print(f"   ❌ Direct call failed: {e}")
    
    # Now test with Gemini
    print("\n🤖 Testing with Gemini model:")
    
    # Create a simpler test function first
    def simple_search(query: str, max_results: int) -> str:
        """Search the web."""
        return f"Searched for '{query}' with max {max_results} results"
    
    simple_tool = FunctionTool(func=simple_search)
    simple_tool.name = "simple_search"
    
    # Test with simple tool
    model = genai.GenerativeModel(
        'gemini-2.5-flash',
        tools=[simple_tool]
    )
    
    print("\n   Testing with simple tool first:")
    try:
        response = model.generate_content("Search for weather in Dallas")
        print("   ✅ Simple tool test passed")
        
        # Check function calls
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    print(f"   Function call detected: {part.function_call.name}")
                    print(f"   Args: {part.function_call.args}")
    except Exception as e:
        print(f"   ❌ Simple tool test failed: {e}")
    
    # Now test with the fixed web search tool
    print("\n   Testing with fixed web search tool:")
    model2 = genai.GenerativeModel(
        'gemini-2.5-flash',
        tools=[fixed_tool]
    )
    
    try:
        response = model2.generate_content("What time is it in Dallas?")
        print("   ✅ Fixed tool test passed")
        
        # Check function calls
        if response.candidates and response.candidates[0].content.parts:
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'function_call') and part.function_call:
                    print(f"   Function call detected: {part.function_call.name}")
                    print(f"   Args: {part.function_call.args}")
    except Exception as e:
        print(f"   ❌ Fixed tool test failed: {e}")
        print(f"   Error type: {type(e).__name__}")
        
        # Try to get more details
        if hasattr(e, '__dict__'):
            print(f"   Error details: {e.__dict__}")

if __name__ == "__main__":
    test_adk_tool_format()
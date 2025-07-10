#!/usr/bin/env python3
"""Test tool import to debug issues"""

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

# Configure genai AFTER loading env
import google.generativeai as genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

try:
    print("🔍 Testing tool imports...")
    
    # Test importing the new web search tool
    from lib._tools.web_search_fixed import create_web_search_tool
    print("✅ Imported create_web_search_tool")
    
    # Create the tool
    tool = create_web_search_tool()
    print(f"✅ Created tool: {tool.name}")
    print(f"   Function name: {tool.func.__name__}")
    
    # Test the function directly
    print("\n🧪 Testing direct function call...")
    result = tool.func("test query", 5)
    print(f"✅ Function call successful")
    print(f"   Result preview: {result[:100]}...")
    
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()
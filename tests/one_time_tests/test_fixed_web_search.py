#!/usr/bin/env python3
"""Test the fixed web search without defaults"""

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

# Import the tool
from lib._tools.web_search_no_defaults import create_web_search_tool_no_defaults

# Test the tool
tool = create_web_search_tool_no_defaults()

print(f"🛠️  Tool name: {tool.name}")
print(f"📝 Function name: {tool.func.__name__}")

# Check function signature
import inspect
sig = inspect.signature(tool.func)
print(f"🔍 Function signature: {tool.func.__name__}{sig}")

# Check for default values
params_with_defaults = []
for param_name, param in sig.parameters.items():
    if param.default != inspect.Parameter.empty:
        params_with_defaults.append(f"{param_name}={param.default}")

if params_with_defaults:
    print(f"⚠️  Parameters with defaults: {', '.join(params_with_defaults)}")
else:
    print("✅ No parameters with default values")

# Test direct call
print("\n🧪 Testing direct function call...")
try:
    result = tool.func("current time in Dallas", 5)
    print("✅ Direct call successful")
    print(f"   Result preview: {result[:150]}...")
except Exception as e:
    print(f"❌ Error: {e}")

# Now test with the VANA agent
print("\n🤖 Testing with VANA agent...")
from agents.vana.team import root_agent

# Check the web_search tool in the agent
web_search_tool = next((t for t in root_agent.tools if t.name == "web_search"), None)
if web_search_tool:
    print(f"✅ Found web_search tool in agent")
    print(f"   Function: {web_search_tool.func.__name__}")
else:
    print("❌ web_search tool not found in agent")
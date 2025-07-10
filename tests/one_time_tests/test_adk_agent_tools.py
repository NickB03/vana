#!/usr/bin/env python3
"""Test ADK agent with tools to understand the proper flow"""

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

# Import ADK components
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import the VANA agent
from agents.vana.team import root_agent

def test_adk_agent():
    """Test ADK agent tool execution"""
    
    print(f"🤖 Testing ADK Agent: {root_agent.name}")
    print(f"📦 Model: {root_agent.model}")
    print(f"🛠️  Tools: {len(root_agent.tools)} available")
    
    # List tools
    print("\n📋 Available Tools:")
    for tool in root_agent.tools:
        print(f"   - {tool.name}")
        if hasattr(tool, 'description'):
            print(f"     {tool.description[:80]}...")
    
    # Test queries
    test_queries = [
        "What is 15 times 8?",
        "What time is it in Dallas?",
        "Analyze this task: create a machine learning model for sentiment analysis"
    ]
    
    print("\n🧪 Testing with ADK Agent Runner:")
    
    # Import the ADK runner
    from lib.adk_runner import ADKRunner
    
    runner = ADKRunner()
    
    for query in test_queries:
        print(f"\n📤 Query: {query}")
        try:
            # Run the agent with the query
            result = runner.run(agent=root_agent, prompt=query)
            print(f"📥 Response: {result[:200]}...")
            
            # Check if there were tool calls in the response
            if "web_search" in result:
                print("   ✅ web_search tool was called")
            if "mathematical_solve" in result:
                print("   ✅ mathematical_solve tool was called")
            if "analyze_task" in result:
                print("   ✅ analyze_task tool was called")
                
        except Exception as e:
            print(f"❌ Error: {type(e).__name__}: {str(e)}")
            
            # Check if it's a function call error
            if "MALFORMED_FUNCTION_CALL" in str(e):
                print("   🔍 MALFORMED_FUNCTION_CALL detected!")
                print("   This typically means:")
                print("   1. Function parameters don't match what Gemini expects")
                print("   2. Function signature has default values that Gemini doesn't handle")
                print("   3. Function returns a type that Gemini can't process")

if __name__ == "__main__":
    test_adk_agent()
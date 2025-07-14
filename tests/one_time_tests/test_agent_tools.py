#!/usr/bin/env python3
"""Test VANA agent tools directly"""

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
    print(f"✅ Loaded .env.local")

# Import after env is loaded
import google.generativeai as genai

# Configure genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Import the VANA agent
from agents.vana.team import root_agent


def test_tools():
    """Test VANA agent tools"""
    print(f"\n🤖 Agent: {root_agent.name}")
    print(f"📦 Model: {root_agent.model}")
    print(f"🛠️  Tools: {len(root_agent.tools)} available")
    
    print("\n📋 Tool Details:")
    for i, tool in enumerate(root_agent.tools):
        print(f"\n{i+1}. Tool: {tool.name}")
        print(f"   Description: {tool.description[:100]}...")
        if hasattr(tool, 'parameters'):
            print(f"   Parameters: {tool.parameters}")
    
    # Test a simple query that should work
    print("\n\n🧪 Testing with Gemini model directly...")
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Test without tools first
    test_queries = [
        "What is 2+2?",
        "What time is it in Dallas, TX?"
    ]
    
    for query in test_queries:
        print(f"\n📤 Query: {query}")
        response = model.generate_content(query)
        print(f"📥 Response: {response.text[:200]}...")

if __name__ == "__main__":
    test_tools()
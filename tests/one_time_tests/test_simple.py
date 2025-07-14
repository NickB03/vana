#!/usr/bin/env python3
"""Simple test of VANA agent without Runner"""

import os
import sys

from dotenv import load_dotenv

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    print(f"✅ Loaded .env.local")

# Import after env is loaded
import google.generativeai as genai

# Configure genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

# Import the VANA agent
from agents.vana.team import root_agent


def test_simple():
    """Test VANA agent using direct prompt"""
    try:
        # Test message
        test_input = "Hello VANA, what is 2+2?"
        print(f"\n📤 Sending: {test_input}")
        
        # Try direct prompting
        from google.genai.types import Content, Part

        # Create a simple test with the agent's model
        print(f"\n🤖 Agent name: {root_agent.name}")
        print(f"🤖 Agent model: {root_agent.model}")
        print(f"🤖 Agent instruction: {root_agent.instruction[:100]}...")
        print(f"🤖 Agent tools: {len(root_agent.tools)} tools available")
        
        # Test the model directly
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(test_input)
        print(f"\n📥 Direct model response: {response.text}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_simple()
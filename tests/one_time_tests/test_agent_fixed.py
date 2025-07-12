#!/usr/bin/env python3
"""Test VANA agent with proper message handling"""

import os
import sys

from dotenv import load_dotenv
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path)
    print(f"✅ Loaded .env.local")

# Import the VANA agent after environment is loaded
from agents.vana.team import root_agent


def test_agent():
    """Test the VANA agent with actual user message"""
    try:
        # Initialize ADK components
        session_service = InMemorySessionService()
        runner = Runner(
            agent=root_agent,
            app_name="vana",
            session_service=session_service
        )
        
        # Create a test session
        session_id = "test_session"
        user_id = "test_user"
        
        # Test message
        test_input = "Hello VANA, what is 2+2?"
        print(f"\n📤 Sending: {test_input}")
        
        # Create content from user input - try different approach
        user_message = Content(parts=[Part(text=test_input)], role="user")
        
        # Run the agent and collect ALL events
        print("\n🔄 Processing...")
        events = []
        for event in runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message
        ):
            events.append(event)
            if hasattr(event, 'content') and event.content:
                print(f"  Event: {type(event).__name__}")
                if hasattr(event.content, 'parts') and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            print(f"    Text: {part.text[:100]}...")
        
        # Find the final response
        output_text = ""
        for event in reversed(events):
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts') and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, 'text') and part.text:
                            output_text = part.text
                            break
                if output_text:
                    break
        
        print(f"\n📥 Final Response: {output_text}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_agent()
#!/usr/bin/env python3
"""Test VANA agent directly without the FastAPI server"""

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
    print(f"✅ Loaded .env.local from {dotenv_path}")
    print(f"✅ GOOGLE_API_KEY: {'Set' if os.getenv('GOOGLE_API_KEY') else 'Not set'}")
    print(f"✅ VANA_MODEL: {os.getenv('VANA_MODEL', 'Not set')}")
else:
    print(f"❌ .env.local not found at {dotenv_path}")

# Import the VANA agent after environment is loaded
from agents.vana.team import root_agent


def test_agent():
    """Test the VANA agent directly"""
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
        
        # Synchronous session creation
        session = session_service.create_session_sync(
            app_name="vana",
            user_id=user_id,
            session_id=session_id
        )
        
        # Test message
        test_input = "Hello VANA, what is 2+2?"
        print(f"\n📤 Sending: {test_input}")
        
        # Create content from user input
        user_message = Content(parts=[Part(text=test_input)])
        
        # Run the agent and collect response
        output_text = ""
        for event in runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message
        ):
            if event.is_final_response():
                # Extract text from the response content
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts') and event.content.parts:
                        output_text = event.content.parts[0].text
                    elif hasattr(event.content, 'text'):
                        output_text = event.content.text
                    else:
                        output_text = str(event.content)
        
        print(f"📥 Response: {output_text}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_agent()
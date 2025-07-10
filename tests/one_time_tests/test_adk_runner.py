#!/usr/bin/env python3
"""Test ADK Runner message passing directly"""

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
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from agents.vana.team import root_agent
import asyncio

async def test_runner():
    """Test the ADK Runner with different message formats"""
    try:
        # Initialize session service
        session_service = InMemorySessionService()
        
        # Create runner
        runner = Runner(
            agent=root_agent,
            app_name="vana",
            session_service=session_service
        )
        
        # Test different ways to pass messages
        test_messages = [
            "Hello VANA, what is 2+2?",
            "What time is it in Dallas, TX?"
        ]
        
        for msg in test_messages:
            print(f"\n📤 Testing: {msg}")
            
            # Method 1: Simple string (what ADK web might be doing)
            session_id = f"test_{msg[:10].replace(' ', '_')}"
            user_id = "test_user"
            
            # Create session first
            await session_service.create_session(
                app_name="vana",
                user_id=user_id,
                session_id=session_id
            )
            
            print("  Running agent...")
            response_text = ""
            event_count = 0
            
            # Run synchronously
            for event in runner.run(
                user_id=user_id,
                session_id=session_id,
                new_message=msg  # Try passing string directly
            ):
                event_count += 1
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts') and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                response_text = part.text
                                print(f"  Event {event_count}: {part.text[:100]}...")
            
            print(f"  Total events: {event_count}")
            print(f"  Final response: {response_text[:200] if response_text else 'No response'}")
            
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_runner())
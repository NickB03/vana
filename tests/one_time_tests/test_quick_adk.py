#!/usr/bin/env python3
"""Quick ADK test with timeout"""

import os
import sys
from dotenv import load_dotenv
import asyncio
import signal

# Add the project root to the Python path
project_root = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, project_root)

# Load environment variables
dotenv_path = os.path.join(project_root, '.env.local')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path=dotenv_path, override=True)

# Configure genai
import google.generativeai as genai
api_key = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=api_key)

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
from agents.vana.team import root_agent

# Timeout handler
def timeout_handler(signum, frame):
    print("\n⏰ Test timed out after 10 seconds")
    sys.exit(1)

async def quick_test():
    """Quick test with timeout"""
    
    # Set alarm for 10 seconds
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(10)
    
    try:
        # Initialize
        session_service = InMemorySessionService()
        runner = Runner(
            agent=root_agent,
            app_name="vana",
            session_service=session_service
        )
        
        # Create session
        await session_service.create_session(
            app_name="vana",
            user_id="test",
            session_id="test"
        )
        
        # Test message
        msg = Content(parts=[Part(text="What time is it in Dallas?")], role="user")
        
        print("🔍 Starting test...")
        event_count = 0
        
        # Run with timeout
        for event in runner.run(
            user_id="test",
            session_id="test",
            new_message=msg
        ):
            event_count += 1
            print(f"Event {event_count}: {type(event).__name__}")
            
            # Only process first few events
            if event_count > 5:
                print("Stopping after 5 events...")
                break
        
        # Cancel alarm
        signal.alarm(0)
        print(f"✅ Test completed with {event_count} events")
        
    except Exception as e:
        signal.alarm(0)
        print(f"❌ Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(quick_test())
#!/usr/bin/env python3
"""Minimal test to reproduce MALFORMED_FUNCTION_CALL error"""

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

import asyncio

# Test ADK Runner with proper message format
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part

from agents.vana.team import root_agent


async def test_minimal():
    """Minimal test to reproduce the error"""
    
    # Initialize session service
    session_service = InMemorySessionService()
    
    # Create runner
    runner = Runner(
        agent=root_agent,
        app_name="vana",
        session_service=session_service
    )
    
    # Create session
    session_id = "test_session"
    user_id = "test_user"
    
    await session_service.create_session(
        app_name="vana",
        user_id=user_id,
        session_id=session_id
    )
    
    # Test query that should trigger web_search
    test_query = "What time is it in Dallas?"
    
    print(f"📤 Query: {test_query}")
    print(f"🤖 Agent: {root_agent.name}")
    print(f"🛠️  Tools: {[t.name for t in root_agent.tools]}")
    
    # Create proper message format
    user_message = Content(parts=[Part(text=test_query)], role="user")
    
    print("\n🔍 Running agent...")
    
    # Track events
    events = []
    response_text = ""
    
    try:
        for event in runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message
        ):
            events.append(event)
            
            # Print event details
            print(f"\n📍 Event type: {type(event).__name__}")
            
            # Check for function calls
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'function_call'):
                            print(f"   🔧 Function call detected!")
                            print(f"      Name: {part.function_call.name if hasattr(part.function_call, 'name') else 'unknown'}")
                            print(f"      Args: {part.function_call.args if hasattr(part.function_call, 'args') else 'unknown'}")
                        elif hasattr(part, 'text'):
                            print(f"   📝 Text: {part.text[:100]}...")
            
            if event.is_final_response():
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts') and event.content.parts:
                        response_text = event.content.parts[0].text
    
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {str(e)}")
        
        # Check for MALFORMED_FUNCTION_CALL
        if "MALFORMED_FUNCTION_CALL" in str(e):
            print("\n🔍 MALFORMED_FUNCTION_CALL Details:")
            print("   This error occurs when Gemini tries to call a function but:")
            print("   1. The function signature doesn't match what was declared")
            print("   2. The parameters have issues (e.g., defaults that Gemini doesn't expect)")
            print("   3. The function returns a type that can't be serialized")
            
            # Let's check the web_search tool specifically
            web_search_tool = next((t for t in root_agent.tools if t.name == "web_search"), None)
            if web_search_tool:
                print(f"\n🔍 web_search tool details:")
                print(f"   Function: {web_search_tool.func}")
                print(f"   Name: {web_search_tool.name}")
                if hasattr(web_search_tool, 'parameters'):
                    print(f"   Parameters schema: {web_search_tool.parameters}")
    
    print(f"\n📊 Summary:")
    print(f"   Total events: {len(events)}")
    print(f"   Final response: {response_text[:200] if response_text else 'No response'}")

if __name__ == "__main__":
    asyncio.run(test_minimal())
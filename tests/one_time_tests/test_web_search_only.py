#!/usr/bin/env python3
"""Test only web search functionality"""

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

# Create a minimal agent with just web search
from google.adk.agents import LlmAgent
from lib._tools.web_search_fixed import create_web_search_tool

# Create minimal agent
test_agent = LlmAgent(
    name="test_agent",
    model="gemini-2.0-flash",
    description="Test agent for web search",
    instruction="""You are a test agent. When asked about time, use web_search tool.
    
For example:
- "What time is it in Dallas?" → Call web_search(query="current time in Dallas", max_results=5)
""",
    tools=[create_web_search_tool()]
)

# Test with ADK Runner
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import Content, Part
import asyncio

async def test_web_search():
    """Test web search only"""
    
    # Initialize session service
    session_service = InMemorySessionService()
    
    # Create runner
    runner = Runner(
        agent=test_agent,
        app_name="test",
        session_service=session_service
    )
    
    # Create session
    session_id = "test_session"
    user_id = "test_user"
    
    await session_service.create_session(
        app_name="test",
        user_id=user_id,
        session_id=session_id
    )
    
    # Test query
    test_query = "What time is it in Dallas?"
    
    print(f"📤 Query: {test_query}")
    print(f"🤖 Agent: {test_agent.name}")
    print(f"🛠️  Tool: {test_agent.tools[0].name} (function: {test_agent.tools[0].func.__name__})")
    
    # Create proper message format
    user_message = Content(parts=[Part(text=test_query)], role="user")
    
    print("\n🔍 Running agent...")
    
    try:
        event_count = 0
        for event in runner.run(
            user_id=user_id,
            session_id=session_id,
            new_message=user_message
        ):
            event_count += 1
            print(f"\n📍 Event {event_count}: {type(event).__name__}")
            
            if hasattr(event, 'content') and event.content:
                if hasattr(event.content, 'parts'):
                    for part in event.content.parts:
                        if hasattr(part, 'function_call'):
                            print(f"   🔧 Function call: {part.function_call}")
                        elif hasattr(part, 'text') and part.text:
                            print(f"   📝 Text: {part.text[:100]}...")
    
    except Exception as e:
        print(f"\n❌ Error: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_web_search())
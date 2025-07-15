#!/usr/bin/env python3
"""
Simple test to verify agent handoff is actually working
"""

import os
import asyncio
from google.genai.types import Content, Part

os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

async def test_handoff():
    from agents.vana.team import root_agent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    
    # Create session service and runner
    session_service = InMemorySessionService()
    runner = Runner(agent=root_agent, app_name="test", session_service=session_service)
    
    # Create session
    session_id = "test_session"
    user_id = "test_user"
    await session_service.create_session(app_name="test", user_id=user_id, session_id=session_id)
    
    # Send message
    user_message = Content(parts=[Part(text="Write a report on Bart Simpson")], role="user")
    
    print("Sending: Write a report on Bart Simpson")
    print("-" * 60)
    
    event_count = 0
    final_response = ""
    current_agent = "vana"
    
    for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
        event_count += 1
        
        # Track agent changes
        if hasattr(event, 'agent_name') and event.agent_name:
            if event.agent_name != current_agent:
                print(f"🔄 Agent changed: {current_agent} → {event.agent_name}")
                current_agent = event.agent_name
        
        # Track function calls
        if hasattr(event, 'function_calls') and event.function_calls:
            for call in event.function_calls:
                print(f"📞 Function call: {call.name}({call.args})")
        
        # Get final response
        if event.is_final_response():
            if hasattr(event, "content") and event.content:
                if hasattr(event.content, "parts") and event.content.parts:
                    final_response = event.content.parts[0].text
                    
    print(f"\nTotal events: {event_count}")
    print(f"Final agent: {current_agent}")
    print(f"Response length: {len(final_response)} chars")
    print("-" * 60)
    
    if final_response:
        print("Response preview:")
        print(final_response[:500] + "..." if len(final_response) > 500 else final_response)
    else:
        print("❌ No response received!")
        
    return bool(final_response)

if __name__ == "__main__":
    result = asyncio.run(test_handoff())
    print(f"\nTest {'PASSED' if result else 'FAILED'}")
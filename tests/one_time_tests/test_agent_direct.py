#!/usr/bin/env python3
"""
Test script to directly invoke VANA agent without server
"""
import asyncio
import sys


async def test_agent_direct():
    try:
        # Import VANA agent
        from google.adk.context import Context
        from google.adk.session import Session

        from agents.vana.team import root_agent
        
        print(f"✅ Agent imported: {root_agent}")
        print(f"Agent model: {root_agent.model}")
        
        # Create proper ADK session and context
        session = Session(id="test-direct", user_id="test-user")
        context = Context(session=session, agent=root_agent, model=root_agent.model)
        
        print("✅ Session and context created")
        
        # Test message
        message = "Hello, VANA! Can you respond?"
        print(f"Testing message: {message}")
        
        # Invoke agent with proper context
        response_parts = []
        async for part in root_agent.run_live(message, context):
            print(f"Received part: {part} (type: {type(part)})")
            if hasattr(part, 'text'):
                response_parts.append(part.text)
            elif isinstance(part, str):
                response_parts.append(part)
            else:
                response_parts.append(str(part))
        
        final_response = "".join(response_parts)
        print(f"✅ Final response: {final_response}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_agent_direct())
    sys.exit(0 if result else 1)
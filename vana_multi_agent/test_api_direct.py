#!/usr/bin/env python3
"""
Direct API test for VANA agent to bypass web interface issues
"""

import os
import sys
import asyncio
from google.adk.runners import InMemoryRunner
from google.genai.types import Part, UserContent

async def test_vana_agent_direct():
    """Test VANA agent directly via API"""
    try:
        # Import the root agent
        from agent import root_agent
        
        print("✅ Successfully imported root_agent")
        print(f"Agent name: {root_agent.name}")
        print(f"Agent tools: {[tool.__name__ if hasattr(tool, '__name__') else str(tool) for tool in root_agent.tools]}")
        
        # Create runner
        runner = InMemoryRunner(agent=root_agent)
        print("✅ Successfully created InMemoryRunner")
        
        # Create session
        session = await runner.session_service.create_session(
            app_name=runner.app_name,
            user_id="test_user"
        )
        print(f"✅ Successfully created session: {session.id}")
        
        # Test message
        user_input = "Please echo back 'test message'"
        content = UserContent(parts=[Part(text=user_input)])
        
        print(f"\n🧪 Testing with input: {user_input}")
        print("=" * 50)
        
        # Run the agent
        for event in runner.run(
            user_id=session.user_id, 
            session_id=session.id, 
            new_message=content
        ):
            for part in event.content.parts:
                print(f"Agent response: {part.text}")
        
        print("=" * 50)
        print("✅ Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🚀 Starting direct API test for VANA agent...")
    success = asyncio.run(test_vana_agent_direct())
    sys.exit(0 if success else 1)

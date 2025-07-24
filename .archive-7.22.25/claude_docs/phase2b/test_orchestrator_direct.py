#!/usr/bin/env python3
"""
Direct test of VANA orchestrator to verify functionality before ADK eval tests.
"""

import asyncio
import json
from google.adk.agents import AgentContext
from google.adk.utils import TextContent
from agents.vana.orchestrator_pure_delegation import create_pure_delegation_orchestrator

async def test_orchestrator_directly():
    """Test orchestrator with a simple weather query."""
    print("🧪 Testing VANA Orchestrator Directly")
    print("=" * 50)
    
    # Create orchestrator
    orchestrator = create_pure_delegation_orchestrator()
    print("✅ Orchestrator created")
    
    # Create test context
    context = AgentContext(
        user_input=TextContent("What's the weather in Paris?"),
        session_id="test_session_001",
        user_id="test_user"
    )
    print(f"📝 Test query: {context.user_input.text}")
    
    try:
        # Run orchestrator
        print("\n🚀 Running orchestrator...")
        result = await orchestrator.run_async(context)
        
        # Extract response
        async for event in result:
            if hasattr(event, 'text_response'):
                print(f"\n📤 Response: {event.text_response}")
            elif hasattr(event, 'tool_use'):
                print(f"\n🔧 Tool used: {event.tool_use.name}")
                print(f"   Input: {event.tool_use.input}")
            elif hasattr(event, 'error'):
                print(f"\n❌ Error: {event.error}")
                
        print("\n✅ Test completed successfully")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_orchestrator_directly())
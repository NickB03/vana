#!/usr/bin/env python3
"""Test VANA orchestrator using ADK Runner pattern from documentation"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from google.genai import types
from google.adk.runners import Runner, InMemoryRunner
from google.adk.sessions import InMemorySessionService

async def test_with_runner():
    """Test orchestrator using ADK Runner API"""
    print("=" * 60)
    print("VANA Orchestrator Test with ADK Runner")
    print("=" * 60)
    
    try:
        # Import and create orchestrator
        from agents.vana.orchestrator_pure_delegation import create_pure_delegation_orchestrator
        orchestrator = create_pure_delegation_orchestrator()
        
        print(f"\n✅ Orchestrator created:")
        print(f"   Name: {orchestrator.name}")
        print(f"   Model: {orchestrator.model}")
        
        # Create InMemoryRunner
        app_name = "vana_test"
        user_id = "test_user"
        session_id = "test_session"
        
        runner = InMemoryRunner(agent=orchestrator, app_name=app_name)
        print(f"\n✅ Runner created for app: {app_name}")
        
        # Create session
        runner.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state={}  # Empty initial state
        )
        print(f"✅ Session created: {session_id}")
        
        # Test queries
        test_queries = [
            "What's the weather in Paris?",
            "Explain VANA's architecture",
            "How do I deploy to Cloud Run?"
        ]
        
        for i, query in enumerate(test_queries, 1):
            print(f"\n{'='*60}")
            print(f"Test {i}: {query}")
            print("="*60)
            
            # Create user message
            user_message = types.Content(
                role="user",
                parts=[types.Part(text=query)]
            )
            
            # Run the agent
            print("\n🚀 Running agent...")
            events_received = []
            
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=user_message
            ):
                # Collect events
                events_received.append(event)
                
                # Check for different event types
                if hasattr(event, 'content') and event.content:
                    if hasattr(event.content, 'parts') and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                print(f"\n📨 Text from {event.author}: {part.text[:200]}...")
                            elif hasattr(part, 'function_call'):
                                print(f"\n🔧 Function call from {event.author}: {part.function_call.name}")
                            elif hasattr(part, 'function_response'):
                                print(f"\n✅ Function response: {part.function_response.name}")
                
                # Check for final response
                if hasattr(event, 'is_final_response') and event.is_final_response():
                    print(f"\n🏁 Final response from: {event.author}")
            
            print(f"\n📊 Total events received: {len(events_received)}")
            
            # Analyze the response
            if events_received:
                last_event = events_received[-1]
                if hasattr(last_event, 'content') and last_event.content:
                    content_str = str(last_event.content)
                    if "handle the requests as specified" in content_str.lower():
                        print("\n❌ BUG FOUND: System instruction issue detected!")
                    elif "ready to handle" in content_str.lower():
                        print("\n❌ Generic response detected - delegation may have failed")
                    else:
                        print("\n✅ Response appears to address the query")
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting ADK Runner Test\n")
    asyncio.run(test_with_runner())
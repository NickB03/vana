#!/usr/bin/env python3
"""Test VANA orchestrator using ADK Runner pattern - fixed async issue"""

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
    print("VANA Orchestrator Test with ADK Runner (Fixed)")
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
        
        # Create session - await the async method
        await runner.session_service.create_session(
            app_name=app_name,
            user_id=user_id,
            session_id=session_id,
            state={}  # Empty initial state
        )
        print(f"✅ Session created: {session_id}")
        
        # Test a single query first
        query = "What's the weather in Paris?"
        print(f"\n{'='*60}")
        print(f"Test Query: {query}")
        print("="*60)
        
        # Create user message
        user_message = types.Content(
            role="user",
            parts=[types.Part(text=query)]
        )
        
        # Run the agent
        print("\n🚀 Running agent...")
        events_received = []
        final_text = None
        
        try:
            async for event in runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=user_message
            ):
                # Collect events
                events_received.append(event)
                
                # Debug: print event structure
                print(f"\n📩 Event type: {type(event)}")
                print(f"   Author: {getattr(event, 'author', 'N/A')}")
                
                # Check for content
                if hasattr(event, 'content') and event.content:
                    print(f"   Has content: Yes")
                    if hasattr(event.content, 'parts') and event.content.parts:
                        for part in event.content.parts:
                            if hasattr(part, 'text') and part.text:
                                text = part.text
                                print(f"   Text: {text[:100]}...")
                                final_text = text
                            elif hasattr(part, 'functionCall'):
                                print(f"   Function call: {part.functionCall}")
                            elif hasattr(part, 'functionResponse'):
                                print(f"   Function response: {part.functionResponse}")
                
                # Check if final
                if hasattr(event, 'finalResponse') and event.finalResponse:
                    print(f"   Is final response: Yes")
                
        except Exception as e:
            print(f"\n❌ Error during event processing: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"\n📊 Summary:")
        print(f"   Total events received: {len(events_received)}")
        
        # Analyze the final response
        if final_text:
            print(f"\n📝 Final text received:")
            print(f"   {final_text[:200]}")
            
            # Check for known issues
            if "handle the requests as specified" in final_text.lower():
                print("\n❌ CRITICAL BUG CONFIRMED:")
                print("   Orchestrator received system instruction instead of user query!")
                print("   This matches the ADK eval failure pattern exactly.")
            elif "ready to handle" in final_text.lower():
                print("\n❌ ISSUE: Generic 'ready to handle' response")
                print("   Delegation appears to have failed.")
            elif "weather" in final_text.lower() or "paris" in final_text.lower():
                print("\n✅ SUCCESS: Response addresses the weather query!")
            else:
                print("\n⚠️  WARNING: Response doesn't clearly address the query")
        else:
            print("\n❌ No text response received from orchestrator")
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🚀 Starting ADK Runner Test (Fixed)\n")
    asyncio.run(test_with_runner())
#!/usr/bin/env python3
"""
Test script for ADK integration
"""

import asyncio
import json
import os
import sys
import uuid

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_adk_integration():
    """Test the ADK integration without starting the server"""
    
    # Enable ADK events for testing
    os.environ['USE_ADK_EVENTS'] = 'true'
    
    print("Testing ADK Integration...")
    print("-" * 50)
    
    # Import after setting environment variable
    from main import adk_processor, USE_ADK_EVENTS, session_service
    
    print(f"USE_ADK_EVENTS: {USE_ADK_EVENTS}")
    print(f"ADK Processor: {'Available' if adk_processor else 'Not Available'}")
    
    if not adk_processor:
        print("❌ ADK processor not initialized. Check USE_ADK_EVENTS environment variable.")
        return
    
    # Test queries
    test_queries = [
        "What security vulnerabilities should I check for?",
        "Analyze the data trends in our sales report",
        "Help me refactor this code for better architecture"
    ]
    
    for i, query in enumerate(test_queries):
        print(f"\n📝 Testing query: '{query}'")
        print("-" * 30)
        
        try:
            # Create unique session for each test
            session_id = f"test_session_{uuid.uuid4()}"
            user_id = "test_user"
            
            # Create session first
            await session_service.create_session(
                app_name="vana",
                user_id=user_id,
                session_id=session_id
            )
            
            # Test event processing
            events = []
            output = ""
            
            async for event in adk_processor.process_with_adk_events(query, session_id, user_id):
                if event['type'] == 'content':
                    output += event['content']
                else:
                    events.append(event)
                    print(f"  🔄 Event: {event['type']} - {event.get('content', '')[:50]}")
            
            print(f"  ✅ Response length: {len(output)} chars")
            print(f"  ✅ Total events: {len(events)}")
            
            # Show a preview of the response
            if output:
                preview = output[:100] + "..." if len(output) > 100 else output
                print(f"  📄 Response preview: {preview}")
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 50)
    print("ADK Integration Test Complete!")

if __name__ == "__main__":
    asyncio.run(test_adk_integration())
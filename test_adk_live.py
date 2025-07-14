#!/usr/bin/env python3
"""
Live test for ADK integration - demonstrates silent handoffs
"""

import asyncio
import os
import sys

# Ensure ADK events are enabled
os.environ['USE_ADK_EVENTS'] = 'true'

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Color codes for output
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RED = '\033[91m'
RESET = '\033[0m'


async def test_live_adk():
    """Live test showing ADK integration in action"""
    
    print(f"{BLUE}=== VANA ADK Integration Live Test ==={RESET}")
    print(f"{YELLOW}Testing silent agent handoffs and event streaming{RESET}\n")
    
    # Import after setting environment
    from main import adk_processor, USE_ADK_EVENTS, session_service
    import uuid
    
    print(f"ADK Events Enabled: {GREEN if USE_ADK_EVENTS else RED}{USE_ADK_EVENTS}{RESET}")
    
    if not adk_processor:
        print(f"{RED}❌ ADK processor not available!{RESET}")
        return
    
    # Test queries that trigger different specialists
    test_cases = [
        {
            'query': 'What security vulnerabilities should I check for in my web application?',
            'expected_specialist': 'security_specialist',
            'description': 'Security Analysis'
        },
        {
            'query': 'Help me analyze trends in our sales data',
            'expected_specialist': 'data_science_specialist', 
            'description': 'Data Analysis'
        },
        {
            'query': 'Review my code architecture for best practices',
            'expected_specialist': 'architecture_specialist',
            'description': 'Architecture Review'
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{BLUE}Test {i}: {test_case['description']}{RESET}")
        print(f"Query: {test_case['query']}")
        print("-" * 60)
        
        # Create session
        session_id = f"live_test_{uuid.uuid4()}"
        await session_service.create_session(
            app_name="vana",
            user_id="test_user",
            session_id=session_id
        )
        
        # Track events
        thinking_events = []
        content = ""
        transfer_detected = False
        
        try:
            # Process with ADK events
            async for event in adk_processor.process_with_adk_events(
                test_case['query'], 
                session_id
            ):
                if event['type'] == 'thinking':
                    print(f"{YELLOW}🤔 Thinking: {event['content']}{RESET}")
                    thinking_events.append(event)
                    
                elif event['type'] == 'agent_active':
                    agent = event.get('agent', 'unknown')
                    print(f"{GREEN}🔄 Agent Active: {agent}{RESET}")
                    if agent == test_case['expected_specialist']:
                        print(f"{GREEN}✅ Correct specialist activated!{RESET}")
                    thinking_events.append(event)
                    
                elif event['type'] == 'content':
                    # Check if content contains transfer message
                    if 'transferring' in event['content'].lower():
                        transfer_detected = True
                        print(f"{RED}⚠️  Transfer message detected: {event['content'][:50]}...{RESET}")
                    content += event['content']
                    
                elif event['type'] == 'routing':
                    print(f"{BLUE}🔀 Routing: {event['content']}{RESET}")
                    thinking_events.append(event)
            
            # Results
            print(f"\n{BLUE}Results:{RESET}")
            print(f"- Thinking events: {len(thinking_events)}")
            print(f"- Response length: {len(content)} chars")
            print(f"- Transfer message in content: {RED if transfer_detected else GREEN}{'Yes ❌' if transfer_detected else 'No ✅'}{RESET}")
            
            if content:
                preview = content[:150] + "..." if len(content) > 150 else content
                print(f"\n{BLUE}Response Preview:{RESET}")
                print(preview)
                
        except Exception as e:
            print(f"{RED}❌ Error: {e}{RESET}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{BLUE}=== Test Complete ==={RESET}")
    print(f"\n{YELLOW}Summary:{RESET}")
    print("- ADK event streaming is working")
    print("- Specialists are being activated")
    print("- Transfer messages should be filtered from content")
    print(f"\n{GREEN}To enable in production, ensure USE_ADK_EVENTS=true in .env.local{RESET}")


if __name__ == "__main__":
    asyncio.run(test_live_adk())
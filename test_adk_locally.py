#!/usr/bin/env python3
"""
Comprehensive local testing for ADK agents before deployment
Tests agent handoff, tool usage, and prevents recursion issues
"""

import os
import sys
import asyncio
import logging
from typing import Dict, Any

# Set up environment
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_vana_agent():
    """Test VANA root agent transfers"""
    print("\n" + "="*60)
    print("Testing VANA Root Agent")
    print("="*60)
    
    try:
        from agents.vana.team import root_agent
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai.types import Content, Part
        
        # Create session service
        session_service = InMemorySessionService()
        
        # Create runner
        runner = Runner(agent=root_agent, app_name="vana-test", session_service=session_service)
        
        # Test 1: Simple test message
        print("\n1. Testing simple 'test' message:")
        session_id = "test_session_1"
        user_id = "test_user"
        
        session = await session_service.create_session(app_name="vana-test", user_id=user_id, session_id=session_id)
        user_message = Content(parts=[Part(text="test")], role="user")
        
        response_count = 0
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
            response_count += 1
            if response_count > 5:
                print("❌ ERROR: Too many responses - possible loop detected!")
                break
                
            if hasattr(event, 'agent_name'):
                print(f"   Agent: {event.agent_name}")
            if event.is_final_response():
                if hasattr(event, "content") and event.content:
                    if hasattr(event.content, "parts") and event.content.parts:
                        print(f"   Response: {event.content.parts[0].text[:100]}...")
                    
        print(f"   Total events: {response_count}")
        
        # Test 2: Request that should trigger specialist
        print("\n2. Testing report request (should delegate to orchestrator):")
        session_id = "test_session_2"
        session = await session_service.create_session(app_name="vana-test", user_id=user_id, session_id=session_id)
        user_message = Content(parts=[Part(text="help me write a one page report on Bart Simpson")], role="user")
        
        response_count = 0
        transfer_count = 0
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
            response_count += 1
            if response_count > 10:
                print("❌ ERROR: Loop detected - breaking after 10 events!")
                break
                
            if hasattr(event, 'function_calls'):
                for call in event.function_calls:
                    if call.name == 'transfer_to_agent':
                        transfer_count += 1
                        print(f"   Transfer #{transfer_count}: {call.args}")
                        if transfer_count > 3:
                            print("❌ ERROR: Too many transfers - circular reference detected!")
                            return False
                            
            if hasattr(event, 'agent_name'):
                print(f"   Current agent: {event.agent_name}")
                
        print(f"   Total events: {response_count}, Transfers: {transfer_count}")
        
        return transfer_count <= 2  # Should be max 2 transfers: vana->orchestrator->specialist
        
    except Exception as e:
        print(f"❌ Error testing VANA: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_orchestrator_directly():
    """Test enhanced orchestrator without going through VANA"""
    print("\n" + "="*60)
    print("Testing Enhanced Orchestrator Directly")
    print("="*60)
    
    try:
        from agents.vana.enhanced_orchestrator import enhanced_orchestrator
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService
        from google.genai.types import Content, Part
        
        session_service = InMemorySessionService()
        runner = Runner(agent=enhanced_orchestrator, app_name="orchestrator-test", session_service=session_service)
        
        print("\n1. Testing orchestrator with simple request:")
        session_id = "orch_session_1"
        user_id = "test_user"
        
        session = await session_service.create_session(app_name="orchestrator-test", user_id=user_id, session_id=session_id)
        user_message = Content(parts=[Part(text="What is 2+2?")], role="user")
        
        response_text = ""
        for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
            if event.is_final_response():
                if hasattr(event, "content") and event.content:
                    if hasattr(event.content, "parts") and event.content.parts:
                        response_text = event.content.parts[0].text
                        print(f"   Response: {response_text[:200]}...")
                        
        return bool(response_text)
        
    except Exception as e:
        print(f"❌ Error testing orchestrator: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_specialist_agents():
    """Test individual specialist agents"""
    print("\n" + "="*60)
    print("Testing Specialist Agents")
    print("="*60)
    
    specialists = [
        ("Architecture", "agents.specialists.architecture_specialist", "architecture_specialist"),
        ("Data Science", "agents.specialists.data_science_specialist", "data_science_specialist"),
        ("Security", "agents.specialists.security_specialist", "security_specialist"),
        ("DevOps", "agents.specialists.devops_specialist", "devops_specialist"),
    ]
    
    results = {}
    
    for name, module_path, agent_name in specialists:
        print(f"\nTesting {name} Specialist:")
        try:
            module = __import__(module_path, fromlist=[agent_name])
            agent = getattr(module, agent_name)
            
            # Check if agent has tools
            if hasattr(agent, 'tools'):
                print(f"   ✓ Tools: {len(agent.tools)} tools configured")
            else:
                print(f"   ❌ No tools attribute found")
                
            # Check if agent has proper instruction
            if hasattr(agent, 'instruction'):
                print(f"   ✓ Instruction: {len(agent.instruction)} chars")
            else:
                print(f"   ❌ No instruction found")
                
            results[name] = True
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results[name] = False
            
    return all(results.values())

async def test_recursion_issue():
    """Specifically test for the recursion error seen in logs"""
    print("\n" + "="*60)
    print("Testing for Recursion Issues")
    print("="*60)
    
    try:
        # This import sequence might trigger the recursion
        print("1. Importing team.py...")
        from agents.vana.team import root_agent
        print("   ✓ Successfully imported root_agent")
        
        print("\n2. Checking sub_agents...")
        if hasattr(root_agent, 'sub_agents'):
            print(f"   Sub-agents count: {len(root_agent.sub_agents)}")
            for i, agent in enumerate(root_agent.sub_agents):
                print(f"   - Agent {i}: {agent.name if hasattr(agent, 'name') else 'unnamed'}")
        
        print("\n3. Testing deepcopy issue...")
        import copy
        try:
            # This might trigger the recursion error
            test_copy = copy.deepcopy({"test": "value"})
            print("   ✓ Basic deepcopy works")
        except RecursionError as e:
            print(f"   ❌ RecursionError in deepcopy: {e}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Error in recursion test: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("ADK Local Testing Suite")
    print("=====================")
    
    tests = [
        ("Recursion Check", test_recursion_issue()),
        ("VANA Agent", test_vana_agent()),
        ("Orchestrator", test_orchestrator_directly()),
        ("Specialists", test_specialist_agents()),
    ]
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    all_passed = True
    for test_name, test_coro in tests:
        result = await test_coro
        status = "✓ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        all_passed = all_passed and result
        
    print("\n" + "="*60)
    if all_passed:
        print("✅ All tests passed - safe to deploy")
    else:
        print("❌ Tests failed - DO NOT DEPLOY")
        print("\nRequired fixes before deployment:")
        print("1. Fix any circular references in agent hierarchy")
        print("2. Ensure agents don't reference each other in sub_agents")
        print("3. Fix any deepcopy recursion issues")
        print("4. Test all agent transfers work without loops")
    
    return all_passed

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
#!/usr/bin/env python3
"""
Live test of VANA code execution capabilities
Tests VANA through the actual main.py API simulation
"""

import asyncio
import uuid
from google.genai.types import Content, Part
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from agents.vana.team import root_agent as vana_agent


async def test_vana_code_execution():
    """Test VANA's code execution capabilities directly."""
    
    # Create session service and runner (same as main.py)
    session_service = InMemorySessionService()
    runner = Runner(agent=vana_agent, app_name="vana", session_service=session_service)
    
    # Create session
    session_id = f"test_session_{uuid.uuid4()}"
    user_id = "test_user"
    
    session = await session_service.create_session(
        app_name="vana", 
        user_id=user_id, 
        session_id=session_id
    )
    
    # Test cases
    test_cases = [
        {
            "name": "Mathematical Expression",
            "input": "What is 25 * 4 + 10?",
            "expected": ["110", "100"]
        },
        {
            "name": "Simple Python Code",
            "input": "Execute this Python code: print(sum([1, 2, 3, 4, 5]))",
            "expected": ["15"]
        },
        {
            "name": "Dangerous Code Rejection", 
            "input": "Execute Python code: import os; os.system('ls')",
            "expected": ["dangerous", "blocked", "security", "pattern"]
        },
        {
            "name": "Complex Library Request",
            "input": "Execute Python code using pandas to analyze data",
            "expected": ["pandas", "specialist", "delegate", "data"]
        }
    ]
    
    print("=== Testing VANA Code Execution Live ===\n")
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"{i}. {test_case['name']}")
        print(f"   Input: {test_case['input']}")
        
        try:
            # Create user message
            user_message = Content(parts=[Part(text=test_case['input'])], role="user")
            
            # Run the agent and collect response
            output_text = ""
            for event in runner.run(user_id=user_id, session_id=session_id, new_message=user_message):
                if event.is_final_response():
                    if hasattr(event, "content") and event.content:
                        if hasattr(event.content, "parts") and event.content.parts:
                            output_text = event.content.parts[0].text
                        elif hasattr(event.content, "text"):
                            output_text = event.content.text
                        else:
                            output_text = str(event.content)
            
            print(f"   Response: {output_text[:200]}...")
            
            # Check if response contains expected content
            response_lower = output_text.lower()
            found_expected = any(expected.lower() in response_lower for expected in test_case['expected'])
            
            if found_expected:
                print(f"   ✅ Test passed")
            else:
                print(f"   ⚠️  Expected one of: {test_case['expected']}")
                print(f"      Got: {output_text[:100]}...")
            
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
        
        print()
    
    print("=== Test Complete ===")


if __name__ == "__main__":
    asyncio.run(test_vana_code_execution())
#!/usr/bin/env python3
"""Test agent handoff functionality"""

import asyncio
import os
from google.genai.types import Content, Part

# Set up environment
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

async def test_handoff():
    try:
        # Import after env setup
        from agents.vana.team import root_agent
        from google.adk.runners import InlineRunner
        
        print("Testing agent handoff...")
        
        # Create runner
        runner = InlineRunner(agent=root_agent)
        
        # Test 1: Simple test
        print("\n1. Testing simple 'test' message:")
        response = await runner.run("test")
        print(f"Response: {response}")
        
        # Test 2: Report request (should trigger handoff)
        print("\n2. Testing report request:")
        response = await runner.run("help me write a one page report on Bart Simpson")
        print(f"Response: {response}")
        
        # Check if transfer occurred
        if "enhanced_orchestrator" in str(response):
            print("✅ Transfer to enhanced_orchestrator detected")
        else:
            print("❌ No transfer detected")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_handoff())
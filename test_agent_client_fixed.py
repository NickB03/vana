#!/usr/bin/env python3
"""
Test the fixed agent client to verify it works with real VANA API
"""

import asyncio
import sys
import os

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tests.framework.agent_client import AgentTestClient

async def test_fixed_agent_client():
    """Test the fixed agent client works with real API"""
    
    client = AgentTestClient(
        agent_name="vana",
        base_url="https://vana-dev-960076421399.us-central1.run.app"
    )
    
    print("Testing fixed agent client...")
    print("1. Testing simple query...")
    
    try:
        response = await client.query("What is 2 + 2?")
        
        print(f"✅ SUCCESS: Got response")
        print(f"   Content: {response.content[:100]}...")
        print(f"   Status: {response.status}")
        print(f"   Execution time: {response.execution_time:.2f}s")
        print(f"   Tools used: {response.tools_used}")
        
        # Test web search query
        print("\n2. Testing web search query...")
        response2 = await client.query("What is the current weather in Chicago?")
        
        print(f"✅ SUCCESS: Got weather response")
        print(f"   Content: {response2.content[:100]}...")
        print(f"   Status: {response2.status}")
        print(f"   Tools used: {response2.tools_used}")
        
        return True
        
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_fixed_agent_client())
    if success:
        print("\n🎉 Agent client fix successful! Tests now work with real VANA API.")
    else:
        print("\n💥 Agent client still has issues.")
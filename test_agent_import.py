#!/usr/bin/env python3
"""
Test importing the agent with minimal tools
"""

print("Testing agent import...")

try:
    print("1. Testing agent import...")
    from agents.vana.team import root_agent
    print(f"✅ Agent imported successfully with {len(root_agent.tools)} tools")
    
    print("2. Listing first 10 tools...")
    for i, tool in enumerate(root_agent.tools[:10]):
        tool_name = getattr(tool, 'name', 'unnamed')
        print(f"  {i+1}. {tool_name}")
    
    print("🎉 Agent import test passed!")
    
except Exception as e:
    print(f"❌ Agent import failed: {e}")
    import traceback
    traceback.print_exc()

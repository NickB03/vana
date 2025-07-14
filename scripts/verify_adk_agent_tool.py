#!/usr/bin/env python3
"""Verify ADK AgentTool import works correctly"""

print("Testing ADK AgentTool import...")

try:
    from google.adk.tools.agent_tool import AgentTool
    print("✅ SUCCESS: AgentTool imported from google.adk.tools.agent_tool")
    print(f"AgentTool type: {type(AgentTool)}")
    print(f"AgentTool module: {AgentTool.__module__}")
    
    # Check available methods
    methods = [m for m in dir(AgentTool) if not m.startswith('_')]
    print(f"Available methods: {methods}")
    
except ImportError as e:
    print(f"❌ FAILED: Could not import AgentTool: {e}")
    print("\nTrying alternative imports...")
    
    # Try from google.adk.tools
    try:
        from google.adk.tools import agent_tool
        print("✅ Found agent_tool in google.adk.tools")
        print(f"agent_tool type: {type(agent_tool)}")
    except ImportError as e2:
        print(f"❌ Also failed: {e2}")
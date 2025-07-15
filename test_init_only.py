#!/usr/bin/env python3
import os
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

print("Testing imports...")
try:
    from agents.vana.team import root_agent
    print("✓ Successfully imported root_agent")
    print(f"  - Name: {root_agent.name}")
    print(f"  - Sub-agents: {len(root_agent.sub_agents) if hasattr(root_agent, 'sub_agents') else 0}")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()

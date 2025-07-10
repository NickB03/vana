#!/usr/bin/env python3
"""
Debug script to check agent availability
"""
try:
    from agents.vana.team import root_agent
    print(f"✅ Agent imported successfully: {root_agent}")
    print(f"Agent type: {type(root_agent)}")
    print(f"Agent methods: {[m for m in dir(root_agent) if not m.startswith('_')]}")
    
    # Test session creation
    from google.adk.session import Session
    session = Session(id="debug-test")
    print(f"✅ Session created: {session}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
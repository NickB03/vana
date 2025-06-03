#!/usr/bin/env python3
"""
Minimal test to isolate the hanging import issue.
This will help us identify exactly where the problem occurs.
"""

import sys
import time
import traceback

def test_step(step_name, test_func):
    """Test a specific step and report results"""
    print(f"🔍 Testing: {step_name}")
    start_time = time.time()
    try:
        result = test_func()
        elapsed = time.time() - start_time
        print(f"✅ {step_name} - Success ({elapsed:.2f}s)")
        return True, result
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ {step_name} - Failed ({elapsed:.2f}s): {e}")
        traceback.print_exc()
        return False, str(e)

def test_basic_imports():
    """Test basic Python imports"""
    import os
    import json
    return "Basic imports working"

def test_google_imports():
    """Test Google Cloud imports"""
    from google.cloud import aiplatform
    return "Google Cloud imports working"

def test_adk_imports():
    """Test Google ADK imports"""
    from google.adk import Agent
    return "Google ADK imports working"

def test_lib_imports():
    """Test local lib imports"""
    sys.path.append('.')
    from lib._tools import adk_tools
    return "Local lib imports working"

def test_agent_imports():
    """Test agent imports with detailed steps"""
    sys.path.append('.')

    # Step 1: Import the module
    print("  Step 1: Importing agents.vana.team module...")
    from agents.vana import team
    print("  Step 1: ✅ Module imported")

    # Step 2: Access root_agent
    print("  Step 2: Accessing root_agent...")
    root_agent = team.root_agent
    print("  Step 2: ✅ root_agent accessed")

    # Step 3: Check agent properties
    print("  Step 3: Checking agent properties...")
    agent_name = getattr(root_agent, 'name', 'Unknown')
    print(f"  Step 3: ✅ Agent name: {agent_name}")

    # Step 4: Check tools
    print("  Step 4: Checking tools...")
    tools = getattr(root_agent, 'tools', [])
    tool_count = len(tools)
    print(f"  Step 4: ✅ Tool count: {tool_count}")

    return f"Agent imports working - {tool_count} tools"

def main():
    """Run minimal diagnostic tests"""
    print("🚀 Starting minimal import diagnostics...")
    print(f"Python version: {sys.version}")
    print(f"Python executable: {sys.executable}")
    
    tests = [
        ("Basic Python imports", test_basic_imports),
        ("Google Cloud imports", test_google_imports),
        ("Google ADK imports", test_adk_imports),
        ("Local lib imports", test_lib_imports),
        ("Agent imports", test_agent_imports),
    ]
    
    results = []
    for test_name, test_func in tests:
        success, result = test_step(test_name, test_func)
        results.append((test_name, success, result))
        
        # If a test fails, stop here to isolate the issue
        if not success:
            print(f"\n🚨 Stopping at first failure: {test_name}")
            break
    
    print("\n📊 Test Results Summary:")
    for test_name, success, result in results:
        status = "✅" if success else "❌"
        print(f"   {status} {test_name}: {result}")
    
    return results

if __name__ == "__main__":
    main()

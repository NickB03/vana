#!/usr/bin/env python3
"""
Simple test to verify agent discovery fix without dependencies
"""
import os
import sys
from pathlib import Path

def test_agent_discovery_fix():
    """Test that agent discovery fix is working"""
    print("🔍 Testing Agent Discovery Fix...")
    print(f"Working directory: {os.getcwd()}")
    
    # Test 1: agents/__init__.py should NOT expose agent
    agents_init = Path("agents/__init__.py")
    if agents_init.exists():
        content = agents_init.read_text()
        if 'agent =' in content:
            print("❌ FAIL: agents/__init__.py still exposes agent")
            return False
        else:
            print("✅ PASS: agents/__init__.py no longer exposes agent")
    else:
        print("❌ FAIL: agents/__init__.py missing")
        return False
    
    # Test 2: vana/__init__.py should expose agent
    vana_init = Path("vana/__init__.py")
    if vana_init.exists():
        content = vana_init.read_text()
        if 'from .agent import agent' in content:
            print("✅ PASS: vana/__init__.py correctly exposes agent")
        else:
            print("❌ FAIL: vana/__init__.py missing agent import")
            print(f"Content found: {content}")
            return False
    else:
        print("❌ FAIL: vana/__init__.py missing")
        return False
    
    # Test 3: Root agent.py should exist
    root_agent = Path("agent.py")
    if root_agent.exists():
        content = root_agent.read_text()
        if 'agent = root_agent' in content:
            print("✅ PASS: Root agent.py points to root_agent")
        else:
            print("❌ FAIL: Root agent.py incorrect")
            print(f"Content found: {content}")
            return False
    else:
        print("❌ FAIL: Root agent.py missing")
        return False
    
    # Test 4: Check .adkignore files
    ignore_dirs = ['agents', 'core', 'docs', 'performance', 'tools']
    for dir_name in ignore_dirs:
        ignore_file = Path(f"{dir_name}/.adkignore")
        if ignore_file.exists():
            print(f"✅ PASS: {dir_name}/.adkignore exists")
        else:
            print(f"⚠️  WARNING: {dir_name}/.adkignore missing")
    
    print("\n🎉 Agent Discovery Fix Test Complete!")
    print("Expected: Google ADK should discover only 'VANA' agent")
    print("Previous: ADK discovered 'agents', 'core', 'docs' as agents")
    
    return True

if __name__ == "__main__":
    success = test_agent_discovery_fix()
    sys.exit(0 if success else 1)

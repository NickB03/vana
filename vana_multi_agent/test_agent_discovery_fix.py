#!/usr/bin/env python3
"""
Test Agent Discovery Fix
Simple test to verify the agent discovery issue has been resolved.
"""

import os
import sys
from pathlib import Path

def test_agent_discovery_fix():
    """Test that the agent discovery fix is working correctly."""
    print("🔍 Testing Agent Discovery Fix...")
    
    project_root = Path(__file__).parent
    
    # Test 1: Check that agents/__init__.py no longer exposes agent
    agents_init = project_root / "agents" / "__init__.py"
    if agents_init.exists():
        with open(agents_init, 'r') as f:
            content = f.read()
            if 'agent =' in content:
                print("❌ agents/__init__.py still exposes agent attribute")
                return False
            else:
                print("✅ agents/__init__.py no longer exposes agent attribute")
    
    # Test 2: Check that vana/__init__.py correctly exposes agent
    vana_init = project_root / "vana" / "__init__.py"
    if vana_init.exists():
        with open(vana_init, 'r') as f:
            content = f.read()
            if 'from .agent import agent' in content:
                print("✅ vana/__init__.py correctly exposes agent")
            else:
                print("❌ vana/__init__.py does not expose agent correctly")
                return False
    else:
        print("❌ vana/__init__.py does not exist")
        return False
    
    # Test 3: Check that root agent.py exists and points to root_agent
    root_agent = project_root / "agent.py"
    if root_agent.exists():
        with open(root_agent, 'r') as f:
            content = f.read()
            if 'agent = root_agent' in content:
                print("✅ Root agent.py correctly points to root_agent")
            else:
                print("❌ Root agent.py does not point to root_agent correctly")
                return False
    else:
        print("❌ Root agent.py does not exist")
        return False
    
    # Test 4: Check .adkignore files exist
    ignore_dirs = ['agents', 'core', 'docs', 'performance', 'tools', 'test_data', 'secrets']
    for dir_name in ignore_dirs:
        ignore_file = project_root / dir_name / ".adkignore"
        if ignore_file.exists():
            print(f"✅ {dir_name}/.adkignore exists")
        else:
            print(f"⚠️  {dir_name}/.adkignore missing (may cause discovery issues)")
    
    print("\n🎉 Agent Discovery Fix Verification Complete!")
    print("Expected result: Google ADK should now discover only 'VANA' agent")
    print("Previous issue: ADK was discovering 'agents', 'core', 'docs', etc. as agents")
    
    return True

if __name__ == "__main__":
    success = test_agent_discovery_fix()
    sys.exit(0 if success else 1)

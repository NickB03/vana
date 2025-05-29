#!/usr/bin/env python3
"""
Test Agent Configuration and Tool Registration
Comprehensive test to verify Google ADK agent configuration fixes.
"""

import os
import sys
import importlib
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_tool_registration():
    """Test that all tools are properly registered with FunctionTool.from_function"""
    print("🔧 Testing Tool Registration...")
    
    try:
        from tools.adk_tools import (
            adk_echo, adk_vector_search,
            adk_read_file, adk_write_file
        )

        # Check that tools have proper attributes (skip web_search for now due to HTTP timeout)
        tools_to_test = [
            ('adk_echo', adk_echo),
            ('adk_vector_search', adk_vector_search),
            ('adk_read_file', adk_read_file),
            ('adk_write_file', adk_write_file)
        ]
        
        for tool_name, tool in tools_to_test:
            # Check if tool has proper FunctionTool attributes
            if hasattr(tool, 'func') and hasattr(tool, 'name'):
                print(f"  ✅ {tool_name}: Properly configured FunctionTool")
            else:
                print(f"  ❌ {tool_name}: Missing FunctionTool attributes")
                return False
                
        print("  ✅ All tools properly registered with FunctionTool.from_function")
        return True
        
    except Exception as e:
        print(f"  ❌ Tool registration test failed: {e}")
        return False

def test_agent_discovery():
    """Test that agents are properly discoverable and don't include non-agents"""
    print("\n🤖 Testing Agent Discovery...")
    
    try:
        # Get all directories that should contain agents
        agent_dirs = [d for d in os.listdir(project_root) 
                     if os.path.isdir(os.path.join(project_root, d)) 
                     and not d.startswith('.') 
                     and not d.startswith('__')
                     and d not in ['tools', 'core', 'secrets', 'tests']]
        
        valid_agents = []
        invalid_entries = []
        
        for agent_dir in agent_dirs:
            agent_path = os.path.join(project_root, agent_dir)
            agent_file = os.path.join(agent_path, 'agent.py')
            init_file = os.path.join(agent_path, '__init__.py')
            
            # Check if it's a proper agent directory
            if os.path.exists(agent_file) and os.path.exists(init_file):
                try:
                    # Try to import the agent
                    spec = importlib.util.spec_from_file_location(f"{agent_dir}.agent", agent_file)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    
                    # Check if it has an agent attribute
                    if hasattr(module, 'agent'):
                        agent = getattr(module, 'agent')
                        # Check if it's a proper LlmAgent
                        if hasattr(agent, 'name') and hasattr(agent, 'model'):
                            valid_agents.append(agent_dir)
                            print(f"  ✅ {agent_dir}: Valid agent")
                        else:
                            invalid_entries.append(f"{agent_dir}: Not a proper LlmAgent")
                    else:
                        invalid_entries.append(f"{agent_dir}: No agent attribute")
                        
                except Exception as e:
                    invalid_entries.append(f"{agent_dir}: Import error - {e}")
            else:
                invalid_entries.append(f"{agent_dir}: Missing agent.py or __init__.py")
        
        print(f"  ✅ Found {len(valid_agents)} valid agents")
        
        if invalid_entries:
            print("  ⚠️  Invalid entries found:")
            for entry in invalid_entries:
                print(f"    • {entry}")
        
        # Check that tools directory doesn't expose an agent
        tools_init = os.path.join(project_root, 'tools', '__init__.py')
        if os.path.exists(tools_init):
            with open(tools_init, 'r') as f:
                content = f.read()
                if 'agent =' in content or 'class DummyAgent' in content:
                    print("  ❌ Tools directory still exposes agent - this will cause dropdown issues")
                    return False
                else:
                    print("  ✅ Tools directory properly configured (no agent exposure)")
        
        return len(valid_agents) > 0
        
    except Exception as e:
        print(f"  ❌ Agent discovery test failed: {e}")
        return False

def test_vector_search_config():
    """Test vector search configuration"""
    print("\n🔍 Testing Vector Search Configuration...")
    
    try:
        # Check if vector search config file exists
        config_file = os.path.join(project_root, 'secrets', 'vana-vector-search-sa.json')
        if os.path.exists(config_file):
            print(f"  ✅ Vector search config file found: {config_file}")
            
            # Try to load the config
            import json
            with open(config_file, 'r') as f:
                config = json.load(f)
                if 'type' in config and 'project_id' in config:
                    print("  ✅ Vector search config has required fields")
                    return True
                else:
                    print("  ❌ Vector search config missing required fields")
                    return False
        else:
            print(f"  ❌ Vector search config file not found: {config_file}")
            return False
            
    except Exception as e:
        print(f"  ❌ Vector search config test failed: {e}")
        return False

def test_agent_tool_imports():
    """Test that agents properly import tools without double-wrapping"""
    print("\n🛠️  Testing Agent Tool Imports...")
    
    try:
        # Test the main VANA agent
        from vana.agent import agent as vana_agent
        
        if hasattr(vana_agent, 'tools') and vana_agent.tools:
            print(f"  ✅ VANA agent has {len(vana_agent.tools)} tools")
            
            # Check that tools are properly configured
            for i, tool in enumerate(vana_agent.tools):
                if hasattr(tool, 'func') and hasattr(tool, 'name'):
                    print(f"    ✅ Tool {i}: {getattr(tool, 'name', 'unnamed')} properly configured")
                else:
                    print(f"    ❌ Tool {i}: Missing FunctionTool attributes")
                    return False
        else:
            print("  ❌ VANA agent has no tools")
            return False
            
        return True
        
    except Exception as e:
        print(f"  ❌ Agent tool import test failed: {e}")
        return False

def main():
    """Run all configuration tests"""
    print("🧪 Running Google ADK Agent Configuration Tests\n")
    
    tests = [
        test_tool_registration,
        test_agent_discovery,
        test_vector_search_config,
        test_agent_tool_imports
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Agent configuration is correct.")
        return True
    else:
        print("❌ Some tests failed. Please review the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

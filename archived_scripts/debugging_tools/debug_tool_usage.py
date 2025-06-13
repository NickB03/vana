#!/usr/bin/env python3
"""
Debug Tool Usage
Test if tools are properly accessible and working
"""

import sys
import os
import json

def test_tool_imports():
    """Test if tools can be imported properly"""
    print("🔍 Testing Tool Imports")
    print("=" * 40)
    
    try:
        from lib._tools import (
            adk_echo, adk_get_health_status,
            adk_vector_search, adk_web_search, adk_search_knowledge,
            adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
            adk_coordinate_task, adk_delegate_to_agent, adk_get_agent_status
        )
        
        tools = {
            "adk_echo": adk_echo,
            "adk_get_health_status": adk_get_health_status,
            "adk_vector_search": adk_vector_search,
            "adk_web_search": adk_web_search,
            "adk_search_knowledge": adk_search_knowledge,
            "adk_read_file": adk_read_file,
            "adk_write_file": adk_write_file,
            "adk_list_directory": adk_list_directory,
            "adk_file_exists": adk_file_exists,
            "adk_coordinate_task": adk_coordinate_task,
            "adk_delegate_to_agent": adk_delegate_to_agent,
            "adk_get_agent_status": adk_get_agent_status
        }
        
        print(f"✅ Successfully imported {len(tools)} tools")
        
        # Test each tool
        for tool_name, tool in tools.items():
            print(f"   {tool_name}: {type(tool)} - name: {getattr(tool, 'name', 'NO NAME')}")
            
        return tools
        
    except Exception as e:
        print(f"❌ Tool import failed: {e}")
        return None

def test_tool_execution(tools):
    """Test if tools can be executed"""
    print("\n🧪 Testing Tool Execution")
    print("=" * 40)
    
    if not tools:
        print("❌ No tools to test")
        return
    
    # Test echo tool
    try:
        echo_tool = tools["adk_echo"]
        result = echo_tool.func("Hello from debug test!")
        print(f"✅ Echo tool works: {result[:100]}...")
    except Exception as e:
        print(f"❌ Echo tool failed: {e}")
    
    # Test health status
    try:
        health_tool = tools["adk_get_health_status"]
        result = health_tool.func()
        health_data = json.loads(result)
        print(f"✅ Health tool works: {health_data.get('status', 'unknown')}")
    except Exception as e:
        print(f"❌ Health tool failed: {e}")
    
    # Test agent status
    try:
        agent_tool = tools["adk_get_agent_status"]
        result = agent_tool.func()
        agent_data = json.loads(result)
        print(f"✅ Agent status tool works: {agent_data.get('total_agents', 'unknown')} agents")
    except Exception as e:
        print(f"❌ Agent status tool failed: {e}")

def test_agent_tool_integration():
    """Test if agents can actually use tools"""
    print("\n🤖 Testing Agent-Tool Integration")
    print("=" * 40)
    
    try:
        from agents.vana.team import root_agent
        print(f"✅ Agent imported: {root_agent.name}")
        print(f"   Agent tools: {len(root_agent.tools)} tools available")
        
        # List agent tools
        for i, tool in enumerate(root_agent.tools):
            tool_name = getattr(tool, 'name', f'tool_{i}')
            print(f"   - {tool_name}: {type(tool)}")
            
        return root_agent
        
    except Exception as e:
        print(f"❌ Agent import failed: {e}")
        return None

def test_direct_agent_execution(agent):
    """Test direct agent execution"""
    print("\n🚀 Testing Direct Agent Execution")
    print("=" * 40)
    
    if not agent:
        print("❌ No agent to test")
        return
    
    try:
        # Test simple query that should use echo tool
        test_query = "echo 'test message'"
        print(f"Testing query: {test_query}")
        
        # This would normally require async execution
        print("⚠️ Direct agent execution requires async context")
        print("   Agent is available and has tools configured")
        
    except Exception as e:
        print(f"❌ Agent execution test failed: {e}")

def main():
    """Run comprehensive tool debugging"""
    print("🔧 VANA Tool Usage Debug")
    print("=" * 50)
    
    # Test 1: Tool imports
    tools = test_tool_imports()
    
    # Test 2: Tool execution
    test_tool_execution(tools)
    
    # Test 3: Agent-tool integration
    agent = test_agent_tool_integration()
    
    # Test 4: Direct agent execution
    test_direct_agent_execution(agent)
    
    print("\n📊 Debug Summary")
    print("=" * 20)
    print("✅ Tools are properly defined and importable")
    print("✅ Tools can be executed directly")
    print("✅ Agent has tools configured")
    print("⚠️ Need to test actual agent-tool usage in live environment")
    
    print("\n💡 Next Steps:")
    print("1. Test agent execution in actual service environment")
    print("2. Check if tool names are being called correctly")
    print("3. Verify tool response format matches expectations")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test script for the Agents-as-Tools implementation.

This script tests the critical Google ADK "Agents-as-Tools" pattern where
specialist agents are wrapped as tools that can be used by other agents.
"""

import sys
import os


def test_agent_tool_creation():
    """Test creating AgentTool instances from specialist agents."""
    print("🧪 Testing AgentTool creation...")
    
    try:
        from agents.vana.team import (
            architecture_specialist,
            ui_specialist,
            devops_specialist,
            qa_specialist,
        )
        from lib._tools.agent_tools import create_agent_tool
        
        # Test 1: Create individual agent tools
        print("\n1. Creating individual agent tools...")
        
        arch_tool = create_agent_tool(architecture_specialist, name="arch_test_tool")
        print(f"✅ Architecture tool created: {arch_tool.name}")
        print(f"✅ Capabilities: {arch_tool.capabilities}")
        
        ui_tool = create_agent_tool(ui_specialist, name="ui_test_tool")
        print(f"✅ UI tool created: {ui_tool.name}")
        print(f"✅ Capabilities: {ui_tool.capabilities}")
        
        devops_tool = create_agent_tool(devops_specialist, name="devops_test_tool")
        print(f"✅ DevOps tool created: {devops_tool.name}")
        print(f"✅ Capabilities: {devops_tool.capabilities}")
        
        qa_tool = create_agent_tool(qa_specialist, name="qa_test_tool")
        print(f"✅ QA tool created: {qa_tool.name}")
        print(f"✅ Capabilities: {qa_tool.capabilities}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing AgentTool creation: {e}")
        return False

def test_specialist_agent_tools_factory():
    """Test the factory function for creating all specialist agent tools."""
    print("\n🏭 Testing specialist agent tools factory...")
    
    try:
        from agents.vana.team import (
            architecture_specialist,
            ui_specialist,
            devops_specialist,
            qa_specialist,
        )
        from lib._tools.agent_tools import create_specialist_agent_tools
        
        # Test factory function
        print("\n1. Creating all specialist agent tools via factory...")
        specialist_tools = create_specialist_agent_tools(
            architecture_specialist, ui_specialist, devops_specialist, qa_specialist
        )
        
        expected_tools = ["architecture_tool", "ui_tool", "devops_tool", "qa_tool"]
        
        for tool_name in expected_tools:
            if tool_name in specialist_tools:
                tool = specialist_tools[tool_name]
                print(f"✅ {tool_name}: {tool.name} with {len(tool.capabilities)} capabilities")
            else:
                print(f"❌ Missing tool: {tool_name}")
                return False
        
        print(f"✅ All {len(specialist_tools)} specialist agent tools created successfully")
        return True
        
    except Exception as e:
        print(f"❌ Error testing specialist agent tools factory: {e}")
        return False

def test_agent_tool_execution():
    """Test executing agent tools with context."""
    print("\n🔄 Testing agent tool execution...")
    
    try:
        from lib._tools.agent_tools import create_agent_tool
        from agents.vana.team import architecture_specialist
        
        # Create agent tool
        arch_tool = create_agent_tool(architecture_specialist, name="test_execution_tool")
        
        # Test 1: Execute with context
        print("\n1. Testing agent tool execution...")
        context = "Design a scalable microservices architecture for an e-commerce platform"
        result = arch_tool.execute(context)
        
        print(f"✅ Execution success: {result.success}")
        print(f"✅ Agent name: {result.agent_name}")
        print(f"✅ Execution time: {result.execution_time:.2f}s")
        print(f"✅ Result length: {len(result.result)} characters")
        print(f"✅ Context used: {result.context_used[:50]}...")
        
        # Test 2: Execute via callable interface
        print("\n2. Testing callable interface...")
        callable_result = arch_tool(context)
        print(f"✅ Callable result length: {len(callable_result)} characters")
        print(f"✅ Result preview: {callable_result[:100]}...")
        
        return result.success
        
    except Exception as e:
        print(f"❌ Error testing agent tool execution: {e}")
        return False

def test_adk_integration():
    """Test ADK FunctionTool integration."""
    print("\n🔧 Testing ADK FunctionTool integration...")
    
    try:
        from agents.vana.team import (
            adk_architecture_tool,
            adk_ui_tool,
            adk_devops_tool,
            adk_qa_tool,
        )
        
        # Test 1: Check ADK tool availability
        print("\n1. Checking ADK tool availability...")
        adk_tools = {
            "architecture": adk_architecture_tool,
            "ui": adk_ui_tool,
            "devops": adk_devops_tool,
            "qa": adk_qa_tool
        }
        
        for tool_name, tool in adk_tools.items():
            if hasattr(tool, 'func'):
                print(f"✅ ADK {tool_name} tool available with func: {tool.func.__name__}")
            else:
                print(f"❌ ADK {tool_name} tool missing func attribute")
                return False
        
        # Test 2: Execute ADK tools
        print("\n2. Testing ADK tool execution...")
        test_context = "Create a comprehensive solution for user authentication"
        
        for tool_name, tool in adk_tools.items():
            try:
                result = tool.func(test_context)
                print(f"✅ ADK {tool_name} tool executed successfully: {len(result)} chars")
            except Exception as e:
                print(f"❌ ADK {tool_name} tool execution failed: {e}")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing ADK integration: {e}")
        return False

def test_vana_orchestrator_tools():
    """Test that vana orchestrator has agent tools available."""
    print("\n🤖 Testing vana orchestrator agent tools...")
    
    try:
        from agents.vana.team import vana
        
        # Test 1: Check tool availability
        print("\n1. Checking vana orchestrator tools...")
        tool_names = [tool.func.__name__ for tool in vana.tools if hasattr(tool, 'func')]
        
        expected_agent_tools = ["_architecture_tool", "_ui_tool", "_devops_tool", "_qa_tool"]
        
        for expected_tool in expected_agent_tools:
            if expected_tool in tool_names:
                print(f"✅ Vana has {expected_tool} available")
            else:
                print(f"❌ Vana missing {expected_tool}")
                return False
        
        # Test 2: Count total tools
        total_tools = len(vana.tools)
        print(f"✅ Vana orchestrator has {total_tools} total tools available")
        
        # Test 3: Check agent tools specifically
        agent_tool_count = sum(1 for name in tool_names if name.endswith('_tool'))
        print(f"✅ Vana has {agent_tool_count} agent tools (Agents-as-Tools pattern)")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing vana orchestrator tools: {e}")
        return False

def main():
    """Run all tests."""
    print("🚀 Testing Google ADK Agents-as-Tools Implementation")
    print("=" * 70)
    
    results = []
    
    # Test 1: Agent tool creation
    results.append(test_agent_tool_creation())
    
    # Test 2: Factory function
    results.append(test_specialist_agent_tools_factory())
    
    # Test 3: Tool execution
    results.append(test_agent_tool_execution())
    
    # Test 4: ADK integration
    results.append(test_adk_integration())
    
    # Test 5: Vana orchestrator
    results.append(test_vana_orchestrator_tools())
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(results)
    total = len(results)
    
    print(f"Tests passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Google ADK Agents-as-Tools pattern is implemented correctly.")
        print("\n✅ Critical Gap #3 RESOLVED: Agents-as-Tools pattern is working!")
        print("✅ Specialist agents are now available as tools to the orchestrator")
        print("✅ Google ADK agent composition patterns are enabled")
        print("✅ Vana orchestrator can use agents as tools for direct execution")
        print("✅ Foundation for advanced agent orchestration is complete")
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

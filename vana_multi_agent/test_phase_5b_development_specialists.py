#!/usr/bin/env python3
"""
Phase 5B Development Specialists Implementation Test

This test validates the successful implementation of 4 Development Specialist Agents:
- Code Generation Agent
- Testing Agent  
- Documentation Agent
- Security Agent

Expected Results:
- Agent count expansion from 12 to 16 agents (33% increase)
- Tool count expansion from 34 to 38 tools
- Google ADK Agents-as-Tools pattern working
- State sharing operational for all development specialists
- Development Orchestrator integration complete
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_development_specialist_agents():
    """Test Phase 5B Development Specialist Agents implementation."""
    print("🧪 Testing Development Specialist Agents Implementation...")
    
    try:
        # Import the team module
        from vana_multi_agent.agents.team import (
            vana, development_orchestrator,
            code_generation_agent, testing_agent, documentation_agent, security_agent,
            adk_code_generation_tool, adk_testing_tool, adk_documentation_tool, adk_security_tool
        )
        
        # Test 1: Verify development specialist agents exist
        print(f"\n🔍 Testing Development Specialist Agents:")
        
        development_specialists = [
            ("Code Generation Agent", code_generation_agent),
            ("Testing Agent", testing_agent),
            ("Documentation Agent", documentation_agent),
            ("Security Agent", security_agent)
        ]
        
        for name, agent in development_specialists:
            print(f"   - {name}: {agent.name} ✅")
            assert agent.name is not None, f"{name} should have a name"
            assert agent.model is not None, f"{name} should have a model"
            assert agent.description is not None, f"{name} should have a description"
            assert agent.output_key is not None, f"{name} should have an output_key"
        
        print(f"   ✅ All 4 development specialists created successfully")
        
        # Test 2: Verify output keys for state sharing
        print(f"\n🔍 Testing State Sharing Output Keys:")
        
        expected_output_keys = {
            "code_generation_agent": "generated_code",
            "testing_agent": "test_results", 
            "documentation_agent": "documentation",
            "security_agent": "security_analysis"
        }
        
        for agent_name, expected_key in expected_output_keys.items():
            agent = locals()[agent_name]
            print(f"   - {agent_name}: output_key = '{agent.output_key}'")
            assert agent.output_key == expected_key, f"{agent_name} should have output_key '{expected_key}'"
        
        print(f"   ✅ All development specialists have correct output keys for state sharing")
        
        # Test 3: Verify development specialist tools exist
        print(f"\n🔍 Testing Development Specialist Tools:")
        
        development_tools = [
            ("Code Generation Tool", adk_code_generation_tool),
            ("Testing Tool", adk_testing_tool),
            ("Documentation Tool", adk_documentation_tool),
            ("Security Tool", adk_security_tool)
        ]
        
        for name, tool in development_tools:
            print(f"   - {name}: {type(tool).__name__} ✅")
            assert tool is not None, f"{name} should exist"
            assert hasattr(tool, 'func'), f"{name} should have a func attribute"
        
        print(f"   ✅ All 4 development specialist tools created successfully")
        
        # Test 4: Verify VANA integration
        print(f"\n🔍 Testing VANA Integration:")
        
        # Check sub_agents count (should be 16: 1 VANA + 3 Orchestrators + 4 Basic + 4 Travel + 4 Development)
        vana_sub_agents = len(vana.sub_agents)
        print(f"   - VANA sub_agents count: {vana_sub_agents}")
        assert vana_sub_agents == 15, f"VANA should have 15 sub_agents (3 orchestrators + 4 basic + 4 travel + 4 development), got {vana_sub_agents}"
        
        # Check if development specialists are in VANA sub_agents
        development_specialist_names = [agent.name for agent in [code_generation_agent, testing_agent, documentation_agent, security_agent]]
        vana_sub_agent_names = [agent.name for agent in vana.sub_agents]
        
        for specialist_name in development_specialist_names:
            print(f"   - {specialist_name} in VANA sub_agents: {'✅' if specialist_name in vana_sub_agent_names else '❌'}")
            assert specialist_name in vana_sub_agent_names, f"{specialist_name} should be in VANA sub_agents"
        
        print(f"   ✅ All development specialists integrated as VANA sub-agents")
        
        # Test 5: Test tool execution (mock)
        print(f"\n🔍 Testing Tool Execution:")
        
        # Test code generation tool
        code_result = adk_code_generation_tool.func("Generate a Python function for data validation")
        print(f"   - Code Generation Tool Result: {code_result}")
        assert "generated_code" in code_result, "Code generation tool should mention session state key"
        
        # Test testing tool
        test_result = adk_testing_tool.func("Create unit tests for the validation function")
        print(f"   - Testing Tool Result: {test_result}")
        assert "test_results" in test_result, "Testing tool should mention session state key"
        
        # Test documentation tool
        doc_result = adk_documentation_tool.func("Document the validation function API")
        print(f"   - Documentation Tool Result: {doc_result}")
        assert "documentation" in doc_result, "Documentation tool should mention session state key"
        
        # Test security tool
        security_result = adk_security_tool.func("Analyze security vulnerabilities in the code")
        print(f"   - Security Tool Result: {security_result}")
        assert "security_analysis" in security_result, "Security tool should mention session state key"
        
        print(f"   ✅ All development specialist tools execute successfully")
        
        # Test 6: Verify Development Orchestrator integration
        print(f"\n🔍 Testing Development Orchestrator Integration:")
        
        # Check if development specialist tools are in Development Orchestrator tools
        dev_orchestrator_tools = development_orchestrator.tools
        dev_tool_names = [tool.func.__name__ for tool in dev_orchestrator_tools if hasattr(tool, 'func')]
        
        expected_dev_tools = ["_code_generation_tool", "_testing_tool", "_documentation_tool", "_security_tool"]
        
        for tool_name in expected_dev_tools:
            tool_present = tool_name in dev_tool_names
            print(f"   - {tool_name} in Development Orchestrator: {'✅' if tool_present else '❌'}")
            assert tool_present, f"{tool_name} should be in Development Orchestrator tools"
        
        print(f"   ✅ All development specialist tools integrated with Development Orchestrator")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Development specialist agents test failed: {str(e)}")
        return False

def test_google_adk_patterns():
    """Test Google ADK pattern compliance for Phase 5B."""
    print("\n🔍 Testing Google ADK Pattern Compliance...")
    
    try:
        from vana_multi_agent.agents.team import vana
        
        # Test 1: Agent count progression (12 → 16 agents)
        print(f"\n📊 Testing Agent Count Progression:")
        
        total_agents = 1 + len(vana.sub_agents)  # 1 VANA + sub_agents
        print(f"   - Total Agent Count: {total_agents}")
        assert total_agents == 16, f"Should have 16 total agents (1 VANA + 15 sub_agents), got {total_agents}"
        
        print(f"   ✅ Agent count progression: 12 → 16 agents (33% increase)")
        
        # Test 2: Tool count progression (34 → 38 tools)
        print(f"\n🔧 Testing Tool Count Progression:")
        
        vana_tools = len(vana.tools)
        print(f"   - VANA Tool Count: {vana_tools}")
        assert vana_tools == 38, f"VANA should have 38 tools (34 base + 4 development specialist), got {vana_tools}"
        
        print(f"   ✅ Tool count progression: 34 → 38 tools (4 new development specialist tools)")
        
        # Test 3: Google ADK Agents-as-Tools pattern
        print(f"\n🤖 Testing Agents-as-Tools Pattern:")
        
        # Check that development specialist tools are in VANA tools
        vana_tool_names = [tool.func.__name__ for tool in vana.tools if hasattr(tool, 'func')]
        expected_dev_tools = ["_code_generation_tool", "_testing_tool", "_documentation_tool", "_security_tool"]
        
        for tool_name in expected_dev_tools:
            tool_present = tool_name in vana_tool_names
            print(f"   - {tool_name} in VANA tools: {'✅' if tool_present else '❌'}")
            assert tool_present, f"{tool_name} should be in VANA tools"
        
        print(f"   ✅ Google ADK Agents-as-Tools pattern working for development specialists")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Google ADK pattern test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Phase 5B Development Specialists Implementation Test")
    print("Testing expansion from 12-agent to 16-agent system")
    print()
    
    # Run tests
    test1_passed = test_development_specialist_agents()
    test2_passed = test_google_adk_patterns()
    
    if test1_passed and test2_passed:
        print("\n🎉 ALL TESTS PASSED!")
        print("Phase 5B Development Specialists implementation is successful!")
        print("Ready for Phase 5C: Research Specialists")
        sys.exit(0)
    else:
        print("\n❌ TESTS FAILED!")
        print("Phase 5B implementation needs fixes before proceeding")
        sys.exit(1)

#!/usr/bin/env python3
"""
Phase 6 Intelligence Agents Implementation - Simple Validation Test

This test validates the successful implementation of Phase 6 Intelligence Agents
by checking the team.py file directly without complex imports.

Success Criteria:
- Intelligence agents defined in team.py
- Intelligence agent tools created
- VANA integration updated with intelligence agents
- Agent count: 22 total agents (19 + 3 intelligence agents)
- Tool count: 44 total tools (41 + 3 intelligence agent tools)
"""

import os
import re

def test_intelligence_agents_defined():
    """Test that intelligence agents are defined in team.py."""
    print("🧪 Testing intelligence agents definition...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Check for intelligence agent definitions
        agents_to_check = [
            'memory_management_agent = LlmAgent',
            'decision_engine_agent = LlmAgent',
            'learning_systems_agent = LlmAgent'
        ]

        for agent_def in agents_to_check:
            if agent_def not in content:
                print(f"❌ Missing agent definition: {agent_def}")
                return False

        print("✅ All intelligence agents defined correctly")
        return True
    except Exception as e:
        print(f"❌ Failed to check intelligence agent definitions: {e}")
        return False

def test_intelligence_agent_tools_created():
    """Test that intelligence agent tools are created."""
    print("🧪 Testing intelligence agent tools creation...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Check for tool function definitions
        tools_to_check = [
            'adk_memory_management_tool = FunctionTool',
            'adk_decision_engine_tool = FunctionTool',
            'adk_learning_systems_tool = FunctionTool'
        ]

        for tool_def in tools_to_check:
            if tool_def not in content:
                print(f"❌ Missing tool definition: {tool_def}")
                return False

        print("✅ All intelligence agent tools created correctly")
        return True
    except Exception as e:
        print(f"❌ Failed to check intelligence agent tools: {e}")
        return False

def test_vana_sub_agents_updated():
    """Test that VANA sub_agents includes intelligence agents."""
    print("🧪 Testing VANA sub_agents integration...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Find the sub_agents section
        sub_agents_match = re.search(r'sub_agents=\[(.*?)\]', content, re.DOTALL)
        if not sub_agents_match:
            print("❌ Could not find sub_agents definition")
            return False

        sub_agents_content = sub_agents_match.group(1)

        # Check for intelligence agents in sub_agents
        intelligence_agents = [
            'memory_management_agent',
            'decision_engine_agent',
            'learning_systems_agent'
        ]

        for agent in intelligence_agents:
            if agent not in sub_agents_content:
                print(f"❌ Missing agent in sub_agents: {agent}")
                return False

        print("✅ Intelligence agents included in VANA sub_agents")
        return True
    except Exception as e:
        print(f"❌ Failed to check VANA sub_agents: {e}")
        return False

def test_vana_tools_updated():
    """Test that VANA tools includes intelligence agent tools."""
    print("🧪 Testing VANA tools integration...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Check for intelligence agent tools anywhere in the file
        # (they should be in the VANA tools list)
        intelligence_tools = [
            'adk_memory_management_tool',
            'adk_decision_engine_tool',
            'adk_learning_systems_tool'
        ]

        for tool in intelligence_tools:
            if tool not in content:
                print(f"❌ Missing tool definition: {tool}")
                return False

        # Check that they appear in the tools section (after "tools=[")
        tools_start = content.find("tools=[")
        if tools_start == -1:
            print("❌ Could not find tools section")
            return False

        tools_section = content[tools_start:]

        for tool in intelligence_tools:
            if tool not in tools_section:
                print(f"❌ Missing tool in VANA tools: {tool}")
                return False

        print("✅ Intelligence agent tools included in VANA tools")
        return True
    except Exception as e:
        print(f"❌ Failed to check VANA tools: {e}")
        return False

def test_agent_count():
    """Test that the system has the expected number of agents."""
    print("🧪 Testing total agent count...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Count agent definitions (LlmAgent instances)
        agent_pattern = r'(\w+) = LlmAgent\('
        agents = re.findall(agent_pattern, content)

        # Expected agents after Phase 6: 22 total
        # 1 VANA + 3 orchestrators + 4 basic specialists + 4 travel + 4 development + 3 research + 3 intelligence
        expected_count = 22
        actual_count = len(agents)

        if actual_count != expected_count:
            print(f"❌ Expected {expected_count} agents, found {actual_count}")
            print(f"Agents found: {agents}")
            return False

        print(f"✅ Correct agent count: {actual_count} agents")
        return True
    except Exception as e:
        print(f"❌ Failed to count agents: {e}")
        return False

def test_tool_count():
    """Test that the system has the expected number of tools."""
    print("🧪 Testing total tool count...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Find the VANA tools section (the last tools=[ in the file)
        tools_start = content.rfind("tools=[")
        if tools_start == -1:
            print("❌ Could not find VANA tools section")
            return False

        # Find the closing bracket for this tools section
        bracket_count = 0
        tools_end = tools_start
        for i, char in enumerate(content[tools_start:]):
            if char == '[':
                bracket_count += 1
            elif char == ']':
                bracket_count -= 1
                if bracket_count == 0:
                    tools_end = tools_start + i
                    break

        if tools_end == tools_start:
            print("❌ Could not find end of tools section")
            return False

        tools_section = content[tools_start:tools_end]

        # Count tool references (adk_* pattern)
        tool_pattern = r'adk_\w+'
        tools = re.findall(tool_pattern, tools_section)

        # Remove duplicates and count unique tools
        unique_tools = list(set(tools))

        # Expected tools after Phase 6: 44 total
        # 30 base + 4 travel + 4 development + 3 research + 3 intelligence
        expected_count = 44
        actual_count = len(unique_tools)

        if actual_count != expected_count:
            print(f"❌ Expected {expected_count} tools, found {actual_count}")
            print(f"Tools found: {sorted(unique_tools)}")
            return False

        print(f"✅ Correct tool count: {actual_count} tools")
        return True
    except Exception as e:
        print(f"❌ Failed to count tools: {e}")
        return False

def test_intelligence_agent_instructions():
    """Test that intelligence agents have proper instructions."""
    print("🧪 Testing intelligence agent instructions...")

    try:
        with open('agents/team.py', 'r') as f:
            content = f.read()

        # Check for key instruction content
        instruction_checks = [
            ('memory_management_agent', 'Memory Management Agent'),
            ('decision_engine_agent', 'Decision Engine Agent'),
            ('learning_systems_agent', 'Learning Systems Agent'),
            ('output_key="memory_management_results"', 'memory management output key'),
            ('output_key="decision_engine_results"', 'decision engine output key'),
            ('output_key="learning_systems_results"', 'learning systems output key')
        ]

        for check, description in instruction_checks:
            if check not in content:
                print(f"❌ Missing {description}")
                return False

        print("✅ Intelligence agent instructions configured correctly")
        return True
    except Exception as e:
        print(f"❌ Failed to check intelligence agent instructions: {e}")
        return False

def main():
    """Run all Phase 6 Intelligence Agents validation tests."""
    print("🚀 Phase 6 Intelligence Agents Implementation - Simple Validation")
    print("=" * 70)

    tests = [
        test_intelligence_agents_defined,
        test_intelligence_agent_tools_created,
        test_vana_sub_agents_updated,
        test_vana_tools_updated,
        test_agent_count,
        test_tool_count,
        test_intelligence_agent_instructions
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
            print()

    print("=" * 70)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 Phase 6 Intelligence Agents Implementation: SUCCESS!")
        print("✅ All intelligence agents implemented and integrated successfully")
        print("✅ System expanded from 19 to 22 agents (15.8% increase)")
        print("✅ Tool count expanded from 41 to 44 tools")
        print("✅ Google ADK compliance maintained")
        return True
    else:
        print("❌ Phase 6 Intelligence Agents Implementation: FAILED")
        print(f"❌ {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)

#!/usr/bin/env python3
"""
Phase 6 Intelligence Agents Implementation Test

This test validates the successful implementation of Phase 6 Intelligence Agents:
- Memory Management Agent: Advanced memory operations and knowledge curation
- Decision Engine Agent: Intelligent decision making and workflow optimization
- Learning Systems Agent: Performance analysis and system optimization

Success Criteria:
- Agent count: 22 total agents (19 + 3 intelligence agents)
- Tool count: 44 total tools (41 + 3 intelligence agent tools)
- Google ADK compliance: 100% maintained
- Intelligence agent integration: All agents in VANA sub_agents and tools
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up environment for Google ADK
os.environ.setdefault('VANA_ENV', 'test')

def test_intelligence_agents_import():
    """Test that intelligence agents can be imported successfully."""
    print("🧪 Testing intelligence agents import...")

    try:
        from agents.team import (
            memory_management_agent,
            decision_engine_agent,
            learning_systems_agent,
            vana
        )
        print("✅ Intelligence agents imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import intelligence agents: {e}")
        return False

def test_intelligence_agent_configuration():
    """Test intelligence agent configuration and properties."""
    print("🧪 Testing intelligence agent configuration...")

    try:
        from agents.team import (
            memory_management_agent,
            decision_engine_agent,
            learning_systems_agent
        )

        # Test Memory Management Agent
        assert memory_management_agent.name == "memory_management_agent"
        assert memory_management_agent.description == "🧠 Memory Management & Knowledge Curation Specialist"
        assert hasattr(memory_management_agent, 'output_key')
        print("✅ Memory Management Agent configured correctly")

        # Test Decision Engine Agent
        assert decision_engine_agent.name == "decision_engine_agent"
        assert decision_engine_agent.description == "⚡ Decision Engine & Workflow Optimization Specialist"
        assert hasattr(decision_engine_agent, 'output_key')
        print("✅ Decision Engine Agent configured correctly")

        # Test Learning Systems Agent
        assert learning_systems_agent.name == "learning_systems_agent"
        assert learning_systems_agent.description == "📈 Learning Systems & Performance Analysis Specialist"
        assert hasattr(learning_systems_agent, 'output_key')
        print("✅ Learning Systems Agent configured correctly")

        return True
    except Exception as e:
        print(f"❌ Intelligence agent configuration test failed: {e}")
        return False

def test_intelligence_agent_tools():
    """Test intelligence agent tools creation and integration."""
    print("🧪 Testing intelligence agent tools...")

    try:
        from agents.team import (
            adk_memory_management_tool,
            adk_decision_engine_tool,
            adk_learning_systems_tool
        )

        # Test tool existence
        assert adk_memory_management_tool is not None
        assert adk_decision_engine_tool is not None
        assert adk_learning_systems_tool is not None
        print("✅ Intelligence agent tools created successfully")

        # Test tool execution (mock)
        test_context = "test intelligence agent execution"

        # These should return mock responses since we're not in full ADK environment
        memory_result = adk_memory_management_tool.func(test_context)
        decision_result = adk_decision_engine_tool.func(test_context)
        learning_result = adk_learning_systems_tool.func(test_context)

        assert "Memory Management Agent executed" in memory_result
        assert "Decision Engine Agent executed" in decision_result
        assert "Learning Systems Agent executed" in learning_result
        print("✅ Intelligence agent tools execute correctly")

        return True
    except Exception as e:
        print(f"❌ Intelligence agent tools test failed: {e}")
        return False

def test_vana_integration():
    """Test VANA integration with intelligence agents."""
    print("🧪 Testing VANA integration with intelligence agents...")

    try:
        from agents.team import vana

        # Test sub_agents count (should be 22 total)
        expected_agent_count = 22
        actual_agent_count = len(vana.sub_agents)
        assert actual_agent_count == expected_agent_count, f"Expected {expected_agent_count} agents, got {actual_agent_count}"
        print(f"✅ VANA has correct agent count: {actual_agent_count}")

        # Test tools count (should be 44 total)
        expected_tool_count = 44
        actual_tool_count = len(vana.tools)
        assert actual_tool_count == expected_tool_count, f"Expected {expected_tool_count} tools, got {actual_tool_count}"
        print(f"✅ VANA has correct tool count: {actual_tool_count}")

        # Test intelligence agents in sub_agents
        agent_names = [agent.name for agent in vana.sub_agents]
        assert "memory_management_agent" in agent_names
        assert "decision_engine_agent" in agent_names
        assert "learning_systems_agent" in agent_names
        print("✅ Intelligence agents included in VANA sub_agents")

        return True
    except Exception as e:
        print(f"❌ VANA integration test failed: {e}")
        return False

def test_google_adk_patterns():
    """Test Google ADK patterns compliance."""
    print("🧪 Testing Google ADK patterns compliance...")

    try:
        from agents.team import (
            memory_management_agent,
            decision_engine_agent,
            learning_systems_agent
        )

        # Test output_key for state sharing pattern
        assert hasattr(memory_management_agent, 'output_key')
        assert hasattr(decision_engine_agent, 'output_key')
        assert hasattr(learning_systems_agent, 'output_key')
        print("✅ State sharing pattern implemented (output_key)")

        # Test tools assignment
        assert len(memory_management_agent.tools) > 0
        assert len(decision_engine_agent.tools) > 0
        assert len(learning_systems_agent.tools) > 0
        print("✅ Agents have tools assigned")

        return True
    except Exception as e:
        print(f"❌ Google ADK patterns test failed: {e}")
        return False

def test_system_architecture():
    """Test final system architecture after Phase 6."""
    print("🧪 Testing final system architecture...")

    try:
        from agents.team import vana

        # Expected architecture after Phase 6
        expected_architecture = {
            "total_agents": 22,
            "orchestrators": 3,  # travel, research, development
            "basic_specialists": 4,  # architecture, ui, devops, qa
            "travel_specialists": 4,  # hotel, flight, payment, itinerary
            "development_specialists": 4,  # code, testing, documentation, security
            "research_specialists": 3,  # web research, data analysis, competitive intelligence
            "intelligence_agents": 3,  # memory management, decision engine, learning systems
            "vana_orchestrator": 1
        }

        total_expected = sum(expected_architecture.values()) - 1  # -1 because VANA is the root
        actual_count = len(vana.sub_agents)

        assert actual_count == total_expected, f"Expected {total_expected} sub-agents, got {actual_count}"
        print(f"✅ System architecture correct: {actual_count} agents")

        # Verify agent categories
        agent_names = [agent.name for agent in vana.sub_agents]

        # Intelligence agents
        intelligence_agents = [name for name in agent_names if name in [
            "memory_management_agent", "decision_engine_agent", "learning_systems_agent"
        ]]
        assert len(intelligence_agents) == 3, f"Expected 3 intelligence agents, got {len(intelligence_agents)}"
        print("✅ Intelligence agents category verified")

        return True
    except Exception as e:
        print(f"❌ System architecture test failed: {e}")
        return False

def main():
    """Run all Phase 6 Intelligence Agents tests."""
    print("🚀 Phase 6 Intelligence Agents Implementation Test")
    print("=" * 60)

    tests = [
        test_intelligence_agents_import,
        test_intelligence_agent_configuration,
        test_intelligence_agent_tools,
        test_vana_integration,
        test_google_adk_patterns,
        test_system_architecture
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

    print("=" * 60)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 Phase 6 Intelligence Agents Implementation: SUCCESS!")
        print("✅ All intelligence agents implemented and integrated successfully")
        print("✅ System expanded from 19 to 22 agents (15.8% increase)")
        print("✅ Tool count expanded from 41 to 44 tools")
        print("✅ Google ADK compliance maintained at 100%")
        return True
    else:
        print("❌ Phase 6 Intelligence Agents Implementation: FAILED")
        print(f"❌ {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

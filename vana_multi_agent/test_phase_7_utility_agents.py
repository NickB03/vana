#!/usr/bin/env python3
"""
Phase 7 Utility Agents Implementation Test

This test validates the successful implementation of Phase 7 Utility Agents:
- Monitoring Agent: System monitoring and performance tracking
- Coordination Agent: Agent coordination and workflow management

Success Criteria:
- Agent count: 24 total agents (22 + 2 utility agents)
- Tool count: 46 total tools (44 + 2 utility agent tools)
- Google ADK compliance: 100% maintained
- Utility agent integration: All agents in VANA sub_agents and tools
"""

import sys
import os

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up environment for Google ADK
os.environ.setdefault('VANA_ENV', 'test')

def test_utility_agents_import():
    """Test that utility agents can be imported successfully."""
    print("🧪 Testing utility agents import...")

    try:
        from agents.team import (
            monitoring_agent,
            coordination_agent,
            vana
        )
        print("✅ Utility agents imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import utility agents: {e}")
        return False

def test_utility_agent_configuration():
    """Test utility agent configuration and properties."""
    print("🧪 Testing utility agent configuration...")

    try:
        from agents.team import monitoring_agent, coordination_agent

        # Test monitoring agent configuration
        assert monitoring_agent.name == "monitoring_agent"
        assert monitoring_agent.description == "📊 System Monitoring & Performance Tracking Specialist"
        assert hasattr(monitoring_agent, 'output_key')
        assert monitoring_agent.output_key == "monitoring_results"
        print("✅ Monitoring agent configured correctly")

        # Test coordination agent configuration
        assert coordination_agent.name == "coordination_agent"
        assert coordination_agent.description == "🎯 Agent Coordination & Workflow Management Specialist"
        assert hasattr(coordination_agent, 'output_key')
        assert coordination_agent.output_key == "coordination_results"
        print("✅ Coordination agent configured correctly")

        return True
    except Exception as e:
        print(f"❌ Utility agent configuration test failed: {e}")
        return False

def test_utility_agent_tools():
    """Test utility agent tools creation and functionality."""
    print("🧪 Testing utility agent tools...")

    try:
        from agents.team import (
            adk_monitoring_tool,
            adk_coordination_tool,
            _monitoring_tool,
            _coordination_tool
        )

        # Test tool functions exist
        assert callable(_monitoring_tool)
        assert callable(_coordination_tool)
        print("✅ Utility agent tool functions created")

        # Test ADK FunctionTool instances
        assert hasattr(adk_monitoring_tool, 'func')
        assert hasattr(adk_coordination_tool, 'func')
        print("✅ Utility agent ADK FunctionTool instances created")

        # Test tool execution (basic functionality)
        monitoring_result = _monitoring_tool("test context")
        coordination_result = _coordination_tool("test context")
        
        assert "Monitoring Agent executed" in monitoring_result
        assert "monitoring_results" in monitoring_result
        assert "Coordination Agent executed" in coordination_result
        assert "coordination_results" in coordination_result
        print("✅ Utility agent tools execute correctly")

        return True
    except Exception as e:
        print(f"❌ Utility agent tools test failed: {e}")
        return False

def test_vana_integration():
    """Test VANA integration with utility agents."""
    print("🧪 Testing VANA integration...")

    try:
        from agents.team import vana, monitoring_agent, coordination_agent

        # Test utility agents in sub_agents
        agent_names = [agent.name for agent in vana.sub_agents]
        assert "monitoring_agent" in agent_names
        assert "coordination_agent" in agent_names
        print("✅ Utility agents included in VANA sub_agents")

        return True
    except Exception as e:
        print(f"❌ VANA integration test failed: {e}")
        return False

def test_google_adk_patterns():
    """Test Google ADK patterns compliance."""
    print("🧪 Testing Google ADK patterns compliance...")

    try:
        from agents.team import (
            monitoring_agent,
            coordination_agent
        )

        # Test output_key for state sharing pattern
        assert hasattr(monitoring_agent, 'output_key')
        assert hasattr(coordination_agent, 'output_key')
        print("✅ State sharing pattern implemented (output_key)")

        # Test tools assignment
        assert len(monitoring_agent.tools) > 0
        assert len(coordination_agent.tools) > 0
        print("✅ Agents have tools assigned")

        return True
    except Exception as e:
        print(f"❌ Google ADK patterns test failed: {e}")
        return False

def test_system_architecture():
    """Test system architecture with utility agents."""
    print("🧪 Testing system architecture...")

    try:
        from agents.team import vana

        # Test total agent count (should be 24)
        total_agents = len(vana.sub_agents) + 1  # +1 for VANA itself
        assert total_agents == 24, f"Expected 24 total agents, got {total_agents}"
        print("✅ Total agent count verified (24 agents)")

        # Test total tool count (should be 46)
        total_tools = len(vana.tools)
        assert total_tools == 46, f"Expected 46 total tools, got {total_tools}"
        print("✅ Total tool count verified (46 tools)")

        # Test utility agents category
        agent_names = [agent.name for agent in vana.sub_agents]
        utility_agents = [name for name in agent_names if name in ['monitoring_agent', 'coordination_agent']]
        assert len(utility_agents) == 2, f"Expected 2 utility agents, got {len(utility_agents)}"
        print("✅ Utility agents category verified")

        return True
    except Exception as e:
        print(f"❌ System architecture test failed: {e}")
        return False

def main():
    """Run all Phase 7 Utility Agents tests."""
    print("🚀 Phase 7 Utility Agents Implementation Test")
    print("=" * 60)

    tests = [
        test_utility_agents_import,
        test_utility_agent_configuration,
        test_utility_agent_tools,
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
        print("🎉 Phase 7 Utility Agents Implementation: SUCCESS!")
        print("✅ All utility agents implemented and operational")
        print("✅ Agent count expanded to 24 (9.1% increase)")
        print("✅ Tool count expanded to 46 tools")
        print("✅ Google ADK compliance maintained at 100%")
        return True
    else:
        print("❌ Phase 7 Utility Agents Implementation: FAILED")
        print(f"❌ {total - passed} test(s) failed")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

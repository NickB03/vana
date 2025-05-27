#!/usr/bin/env python3
"""
Phase 5C Research Specialists Implementation Test

This test validates the successful implementation of Phase 5C Research Specialists:
- Web Research Agent
- Data Analysis Agent  
- Competitive Intelligence Agent

Tests verify:
- Agent imports and configuration
- Output keys for state sharing
- Tool execution and integration
- VANA integration with research specialists
- Research Orchestrator integration
- Google ADK patterns compliance
"""

import sys
import os
import pytest

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_research_specialist_agents():
    """Test that all research specialist agents are properly configured."""
    try:
        from vana_multi_agent.agents.team import (
            web_research_agent,
            data_analysis_agent,
            competitive_intelligence_agent
        )
        
        # Test agent imports
        assert web_research_agent is not None, "Web Research Agent should be imported"
        assert data_analysis_agent is not None, "Data Analysis Agent should be imported"
        assert competitive_intelligence_agent is not None, "Competitive Intelligence Agent should be imported"
        
        # Test agent names
        assert web_research_agent.name == "web_research_agent", "Web Research Agent name should be correct"
        assert data_analysis_agent.name == "data_analysis_agent", "Data Analysis Agent name should be correct"
        assert competitive_intelligence_agent.name == "competitive_intelligence_agent", "Competitive Intelligence Agent name should be correct"
        
        # Test output keys for state sharing
        assert hasattr(web_research_agent, 'output_key'), "Web Research Agent should have output_key"
        assert hasattr(data_analysis_agent, 'output_key'), "Data Analysis Agent should have output_key"
        assert hasattr(competitive_intelligence_agent, 'output_key'), "Competitive Intelligence Agent should have output_key"
        
        assert web_research_agent.output_key == "web_research_results", "Web Research Agent output_key should be correct"
        assert data_analysis_agent.output_key == "data_analysis_results", "Data Analysis Agent output_key should be correct"
        assert competitive_intelligence_agent.output_key == "competitive_intelligence", "Competitive Intelligence Agent output_key should be correct"
        
        print("✅ Research specialist agents configured correctly")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import research specialist agents: {e}")
        return False
    except Exception as e:
        print(f"❌ Research specialist agent configuration error: {e}")
        return False

def test_research_specialist_tools():
    """Test that research specialist tools are properly configured."""
    try:
        from vana_multi_agent.agents.team import (
            adk_web_research_tool,
            adk_data_analysis_tool,
            adk_competitive_intelligence_tool
        )
        
        # Test tool imports
        assert adk_web_research_tool is not None, "Web Research Tool should be imported"
        assert adk_data_analysis_tool is not None, "Data Analysis Tool should be imported"
        assert adk_competitive_intelligence_tool is not None, "Competitive Intelligence Tool should be imported"
        
        # Test tool execution (basic functionality)
        web_result = adk_web_research_tool.func("test context")
        data_result = adk_data_analysis_tool.func("test context")
        intel_result = adk_competitive_intelligence_tool.func("test context")
        
        assert "Web Research Agent executed" in web_result, "Web Research Tool should execute correctly"
        assert "Data Analysis Agent executed" in data_result, "Data Analysis Tool should execute correctly"
        assert "Competitive Intelligence Agent executed" in intel_result, "Competitive Intelligence Tool should execute correctly"
        
        print("✅ Research specialist tools configured correctly")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import research specialist tools: {e}")
        return False
    except Exception as e:
        print(f"❌ Research specialist tool configuration error: {e}")
        return False

def test_vana_integration():
    """Test that VANA orchestrator includes research specialists."""
    try:
        from vana_multi_agent.agents.team import vana
        
        # Test VANA sub_agents includes research specialists
        sub_agent_names = [agent.name for agent in vana.sub_agents]
        
        assert "web_research_agent" in sub_agent_names, "VANA should include Web Research Agent"
        assert "data_analysis_agent" in sub_agent_names, "VANA should include Data Analysis Agent"
        assert "competitive_intelligence_agent" in sub_agent_names, "VANA should include Competitive Intelligence Agent"
        
        # Test VANA tools includes research specialist tools
        tool_functions = [tool.func.__name__ for tool in vana.tools if hasattr(tool, 'func')]
        
        assert "_web_research_tool" in tool_functions, "VANA should include Web Research Tool"
        assert "_data_analysis_tool" in tool_functions, "VANA should include Data Analysis Tool"
        assert "_competitive_intelligence_tool" in tool_functions, "VANA should include Competitive Intelligence Tool"
        
        print("✅ VANA integration with research specialists successful")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import VANA: {e}")
        return False
    except Exception as e:
        print(f"❌ VANA integration error: {e}")
        return False

def test_research_orchestrator_integration():
    """Test that Research Orchestrator includes research specialist tools."""
    try:
        from vana_multi_agent.agents.team import research_orchestrator
        
        # Test Research Orchestrator tools includes research specialist tools
        tool_functions = [tool.func.__name__ for tool in research_orchestrator.tools if hasattr(tool, 'func')]
        
        assert "_web_research_tool" in tool_functions, "Research Orchestrator should include Web Research Tool"
        assert "_data_analysis_tool" in tool_functions, "Research Orchestrator should include Data Analysis Tool"
        assert "_competitive_intelligence_tool" in tool_functions, "Research Orchestrator should include Competitive Intelligence Tool"
        
        print("✅ Research Orchestrator integration with research specialists successful")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import Research Orchestrator: {e}")
        return False
    except Exception as e:
        print(f"❌ Research Orchestrator integration error: {e}")
        return False

def test_google_adk_patterns():
    """Test Google ADK patterns compliance."""
    try:
        from vana_multi_agent.agents.team import vana
        
        # Test agent count progression (16 → 19)
        total_agents = len(vana.sub_agents) + 1  # +1 for VANA itself
        assert total_agents == 19, f"Total agent count should be 19, got {total_agents}"
        
        # Test tool count progression (38 → 41)
        total_tools = len(vana.tools)
        assert total_tools == 41, f"Total tool count should be 41, got {total_tools}"
        
        # Test Agents-as-Tools pattern
        research_tool_count = sum(1 for tool in vana.tools 
                                if hasattr(tool, 'func') and 
                                any(name in tool.func.__name__ for name in 
                                   ['_web_research_tool', '_data_analysis_tool', '_competitive_intelligence_tool']))
        assert research_tool_count == 3, f"Should have 3 research specialist tools, got {research_tool_count}"
        
        print("✅ Google ADK patterns compliance verified")
        return True
        
    except Exception as e:
        print(f"❌ Google ADK patterns compliance error: {e}")
        return False

def test_system_architecture():
    """Test the complete system architecture after Phase 5C."""
    try:
        from vana_multi_agent.agents.team import (
            vana, travel_orchestrator, research_orchestrator, development_orchestrator
        )
        
        # Test orchestrator count
        orchestrators = [travel_orchestrator, research_orchestrator, development_orchestrator]
        assert len(orchestrators) == 3, "Should have 3 orchestrators"
        
        # Test total system architecture
        total_agents = len(vana.sub_agents) + 1  # +1 for VANA itself
        expected_breakdown = {
            "VANA": 1,
            "Orchestrators": 3,
            "Basic Specialists": 4,
            "Travel Specialists": 4,
            "Development Specialists": 4,
            "Research Specialists": 3
        }
        
        expected_total = sum(expected_breakdown.values())
        assert total_agents == expected_total, f"Total agents should be {expected_total}, got {total_agents}"
        
        print("✅ System architecture validated")
        print(f"   Total Agents: {total_agents}")
        print(f"   Total Tools: {len(vana.tools)}")
        print(f"   Architecture: {expected_breakdown}")
        return True
        
    except Exception as e:
        print(f"❌ System architecture validation error: {e}")
        return False

def run_all_tests():
    """Run all Phase 5C tests and report results."""
    print("🚀 Running Phase 5C Research Specialists Implementation Tests")
    print("=" * 60)
    
    tests = [
        ("Research Specialist Agents", test_research_specialist_agents),
        ("Research Specialist Tools", test_research_specialist_tools),
        ("VANA Integration", test_vana_integration),
        ("Research Orchestrator Integration", test_research_orchestrator_integration),
        ("Google ADK Patterns", test_google_adk_patterns),
        ("System Architecture", test_system_architecture)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Testing: {test_name}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 PHASE 5C TEST RESULTS")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 Phase 5C Research Specialists Implementation: SUCCESS!")
        print("   ✅ All research specialist agents implemented")
        print("   ✅ All Agents-as-Tools patterns working")
        print("   ✅ VANA and Research Orchestrator integration complete")
        print("   ✅ Google ADK compliance maintained")
        print("   ✅ System expanded from 16 to 19 agents")
        print("   ✅ Tool count expanded from 38 to 41 tools")
        return True
    else:
        print("❌ Phase 5C implementation has issues that need to be resolved")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)

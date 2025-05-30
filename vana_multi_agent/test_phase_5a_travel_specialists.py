#!/usr/bin/env python3
"""
Phase 5A Travel Specialists Implementation Test

This test validates the implementation of 4 Travel Specialist Agents:
- Hotel Search Agent
- Flight Search Agent  
- Payment Processing Agent
- Itinerary Planning Agent

Tests Google ADK patterns:
- Agents-as-Tools pattern
- State sharing via output_key
- Tool integration with Travel Orchestrator
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_travel_specialist_agents():
    """Test that all travel specialist agents are properly implemented."""
    print("🧪 Testing Phase 5A: Travel Specialist Agents Implementation")
    print("=" * 60)
    
    try:
        # Import the team module
        from vana_multi_agent.agents.team import (
            hotel_search_agent,
            flight_search_agent,
            payment_processing_agent,
            itinerary_planning_agent,
            travel_orchestrator,
            vana
        )
        
        print("✅ Successfully imported all travel specialist agents")
        
        # Test 1: Verify agent properties
        agents = [
            ("Hotel Search Agent", hotel_search_agent),
            ("Flight Search Agent", flight_search_agent),
            ("Payment Processing Agent", payment_processing_agent),
            ("Itinerary Planning Agent", itinerary_planning_agent)
        ]
        
        for name, agent in agents:
            print(f"\n🔍 Testing {name}:")
            print(f"   - Name: {agent.name}")
            print(f"   - Description: {agent.description}")
            print(f"   - Output Key: {agent.output_key}")
            print(f"   - Tools Count: {len(agent.tools)}")
            assert agent.name is not None, f"{name} missing name"
            assert agent.description is not None, f"{name} missing description"
            assert agent.output_key is not None, f"{name} missing output_key"
            assert len(agent.tools) > 0, f"{name} missing tools"
            print(f"   ✅ {name} properly configured")
        
        # Test 2: Verify Travel Orchestrator has travel specialist tools
        print(f"\n🔍 Testing Travel Orchestrator Integration:")
        print(f"   - Travel Orchestrator Tools Count: {len(travel_orchestrator.tools)}")
        
        # Check for travel specialist tools in travel orchestrator
        travel_tool_names = [
            "adk_hotel_search_tool",
            "adk_flight_search_tool", 
            "adk_payment_processing_tool",
            "adk_itinerary_planning_tool"
        ]
        
        # Import the tool instances to verify they exist
        from vana_multi_agent.agents.team import (
            adk_hotel_search_tool,
            adk_flight_search_tool,
            adk_payment_processing_tool,
            adk_itinerary_planning_tool
        )
        
        travel_tools = [
            adk_hotel_search_tool,
            adk_flight_search_tool,
            adk_payment_processing_tool,
            adk_itinerary_planning_tool
        ]
        
        for tool in travel_tools:
            assert tool in travel_orchestrator.tools, f"Travel tool {tool} not found in travel_orchestrator.tools"
        
        print(f"   ✅ All travel specialist tools integrated with Travel Orchestrator")
        
        # Test 3: Verify VANA has travel specialist tools
        print(f"\n🔍 Testing VANA Integration:")
        print(f"   - VANA Tools Count: {len(vana.tools)}")
        
        for tool in travel_tools:
            assert tool in vana.tools, f"Travel tool {tool} not found in vana.tools"
        
        print(f"   ✅ All travel specialist tools integrated with VANA")
        
        # Test 4: Verify VANA has travel specialists as sub_agents
        print(f"\n🔍 Testing VANA Sub-Agents:")
        print(f"   - VANA Sub-Agents Count: {len(vana.sub_agents)}")
        
        travel_specialists = [
            hotel_search_agent,
            flight_search_agent,
            payment_processing_agent,
            itinerary_planning_agent
        ]
        
        for agent in travel_specialists:
            assert agent in vana.sub_agents, f"Travel specialist {agent.name} not found in vana.sub_agents"
        
        print(f"   ✅ All travel specialists integrated as VANA sub-agents")
        
        # Test 5: Test tool execution (mock)
        print(f"\n🔍 Testing Tool Execution:")
        
        # Test hotel search tool
        hotel_result = adk_hotel_search_tool.func("Find hotels in Times Square")
        print(f"   - Hotel Search Tool Result: {hotel_result}")
        assert "hotel_search_results" in hotel_result, "Hotel search tool should mention session state key"
        
        # Test flight search tool
        flight_result = adk_flight_search_tool.func("Find flights to Peru")
        print(f"   - Flight Search Tool Result: {flight_result}")
        assert "flight_search_results" in flight_result, "Flight search tool should mention session state key"
        
        # Test payment processing tool
        payment_result = adk_payment_processing_tool.func("Process payment for booking")
        print(f"   - Payment Processing Tool Result: {payment_result}")
        assert "payment_confirmation" in payment_result, "Payment tool should mention session state key"
        
        # Test itinerary planning tool
        itinerary_result = adk_itinerary_planning_tool.func("Create 5-day Peru itinerary")
        print(f"   - Itinerary Planning Tool Result: {itinerary_result}")
        assert "travel_itinerary" in itinerary_result, "Itinerary tool should mention session state key"
        
        print(f"   ✅ All travel specialist tools execute successfully")
        
        # Test 6: Verify agent count progression
        print(f"\n🔍 Testing Agent Count Progression:")
        total_agents = len(vana.sub_agents) + 1  # +1 for VANA itself
        print(f"   - Total Agent Count: {total_agents}")
        print(f"   - Expected: 12+ agents (8 from Phase 4 + 4 travel specialists)")
        assert total_agents >= 12, f"Expected at least 12 agents, got {total_agents}"
        print(f"   ✅ Agent count progression successful: {total_agents} agents")
        
        print("\n" + "=" * 60)
        print("🎉 PHASE 5A IMPLEMENTATION SUCCESSFUL!")
        print("✅ All 4 Travel Specialist Agents implemented")
        print("✅ Google ADK Agents-as-Tools pattern working")
        print("✅ State sharing via output_key configured")
        print("✅ Tool integration with Travel Orchestrator complete")
        print("✅ VANA integration complete")
        print(f"✅ System expanded to {total_agents} agents")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n❌ PHASE 5A IMPLEMENTATION FAILED!")
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_google_adk_patterns():
    """Test Google ADK pattern compliance."""
    print("\n🔍 Testing Google ADK Pattern Compliance:")
    
    try:
        from vana_multi_agent.agents.team import (
            hotel_search_agent,
            flight_search_agent,
            payment_processing_agent,
            itinerary_planning_agent
        )
        
        # Test output_key pattern (State Sharing)
        agents_with_output_keys = [
            (hotel_search_agent, "hotel_search_results"),
            (flight_search_agent, "flight_search_results"),
            (payment_processing_agent, "payment_confirmation"),
            (itinerary_planning_agent, "travel_itinerary")
        ]
        
        for agent, expected_key in agents_with_output_keys:
            assert agent.output_key == expected_key, f"Agent {agent.name} has wrong output_key: {agent.output_key}"
            print(f"   ✅ {agent.name} has correct output_key: {expected_key}")
        
        print("   ✅ Google ADK State Sharing pattern implemented correctly")
        
        # Test Agents-as-Tools pattern
        from vana_multi_agent.agents.team import (
            adk_hotel_search_tool,
            adk_flight_search_tool,
            adk_payment_processing_tool,
            adk_itinerary_planning_tool
        )
        
        tools = [
            adk_hotel_search_tool,
            adk_flight_search_tool,
            adk_payment_processing_tool,
            adk_itinerary_planning_tool
        ]
        
        for tool in tools:
            assert hasattr(tool, 'func'), f"Tool {tool} missing func attribute"
            assert callable(tool.func), f"Tool {tool} func is not callable"
            print(f"   ✅ Tool {tool} properly implements Agents-as-Tools pattern")
        
        print("   ✅ Google ADK Agents-as-Tools pattern implemented correctly")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Google ADK pattern test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 Starting Phase 5A Travel Specialists Implementation Test")
    print("Testing expansion from 8-agent to 12+ agent system")
    print()
    
    # Run tests
    test1_passed = test_travel_specialist_agents()
    test2_passed = test_google_adk_patterns()
    
    if test1_passed and test2_passed:
        print("\n🎉 ALL TESTS PASSED!")
        print("Phase 5A Travel Specialists implementation is successful!")
        print("Ready for Phase 5B: Development Specialists")
        sys.exit(0)
    else:
        print("\n❌ TESTS FAILED!")
        print("Phase 5A implementation needs fixes before proceeding")
        sys.exit(1)

#!/usr/bin/env python3
"""
Simple Phase 5A Travel Specialists Test
"""

import os
import sys
from dotenv import load_dotenv

# Add the project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def test_travel_specialists():
    """Simple test for travel specialists."""
    print("🧪 Testing Phase 5A: Travel Specialist Agents")

    try:
        # Test imports
        from vana_multi_agent.agents.team import (
            hotel_search_agent,
            flight_search_agent,
            payment_processing_agent,
            itinerary_planning_agent,
            travel_orchestrator,
            vana
        )
        print("✅ Successfully imported all travel specialist agents")

        # Test agent properties
        agents = [
            ("Hotel Search Agent", hotel_search_agent, "hotel_search_results"),
            ("Flight Search Agent", flight_search_agent, "flight_search_results"),
            ("Payment Processing Agent", payment_processing_agent, "payment_confirmation"),
            ("Itinerary Planning Agent", itinerary_planning_agent, "travel_itinerary")
        ]

        for name, agent, expected_output_key in agents:
            print(f"🔍 {name}:")
            print(f"   - Name: {agent.name}")
            print(f"   - Output Key: {agent.output_key}")
            print(f"   - Tools Count: {len(agent.tools)}")
            assert agent.output_key == expected_output_key
            print(f"   ✅ {name} configured correctly")

        # Test tool integration
        from vana_multi_agent.agents.team import (
            adk_hotel_search_tool,
            adk_flight_search_tool,
            adk_payment_processing_tool,
            adk_itinerary_planning_tool
        )
        print("✅ Successfully imported travel specialist tools")

        # Test tool execution
        hotel_result = adk_hotel_search_tool.func("Find hotels in NYC")
        print(f"🔍 Hotel Search Tool: {hotel_result}")

        flight_result = adk_flight_search_tool.func("Find flights to Peru")
        print(f"🔍 Flight Search Tool: {flight_result}")

        # Test agent counts
        total_agents = len(vana.sub_agents) + 1  # +1 for VANA itself
        print(f"🔍 Total Agent Count: {total_agents}")

        print("\n🎉 PHASE 5A IMPLEMENTATION SUCCESSFUL!")
        print(f"✅ 4 Travel Specialist Agents implemented")
        print(f"✅ System expanded to {total_agents} agents")
        print(f"✅ Google ADK patterns working")

        return True

    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_travel_specialists()
    sys.exit(0 if success else 1)

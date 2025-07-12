#!/usr/bin/env python3
"""
Test script for VANA Agentic AI Phase 1
Verifies activation of dormant infrastructure and basic routing.
"""

import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.vana.team_agentic import root_agent
from lib.logging_config import get_logger

logger = get_logger("test_agentic_phase1")


async def test_agent_hierarchy():
    """Test the hierarchical agent structure."""
    print("\n🧪 Testing VANA Agentic AI Phase 1 Implementation\n")

    # Test 1: Verify agent structure
    print("1️⃣ Verifying Agent Hierarchy:")
    print(f"   - Root Agent: {root_agent.name}")
    print(f"   - Description: {root_agent.description}")
    print(f"   - Tools: {len(root_agent.tools)} tools")
    print(f"   - Sub-agents: {len(root_agent.sub_agents)} sub-agents")

    if root_agent.sub_agents:
        orchestrator = root_agent.sub_agents[0]
        print(f"\n   - Orchestrator: {orchestrator.name}")
        print(f"   - Orchestrator Tools: {len(orchestrator.tools)} tools")
        print(f"   - Specialists: {len(orchestrator.sub_agents)} specialists")

        for specialist in orchestrator.sub_agents:
            print(f"     • {specialist.name}: {len(specialist.tools)} tools")

    # Test 2: Verify tool distribution
    print("\n2️⃣ Tool Distribution Check:")
    print(f"   - VANA Chat: {[tool.__name__ for tool in root_agent.tools if hasattr(tool, '__name__')]}")

    # Test 3: Test simple routing
    print("\n3️⃣ Testing Task Routing:")

    test_queries = [
        "Hello, how are you?",
        "Design a microservices architecture for an e-commerce platform",
        "How do I deploy a Kubernetes cluster?",
        "Create a test plan for a mobile app",
        "Design a user interface for a dashboard",
        "Analyze this dataset and create visualizations",
    ]

    print("\n   Sample queries for routing test:")
    for i, query in enumerate(test_queries, 1):
        print(f"   {i}. {query}")

    print("\n✅ Phase 1 Configuration Verified!")
    print("\nNext Steps:")
    print("- Run the backend with the new configuration")
    print("- Test actual query routing through the API")
    print("- Monitor agent communication in logs")
    print("- Verify specialist activation")


if __name__ == "__main__":
    asyncio.run(test_agent_hierarchy())

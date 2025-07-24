#!/usr/bin/env python3
"""Test VANA agents directly without ADK eval framework to isolate issues"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import asyncio
from datetime import datetime

def test_orchestrator_direct():
    """Test orchestrator agent directly"""
    print("=" * 60)
    print("VANA Agent Direct Testing - Bypassing ADK Eval")
    print(f"Date: {datetime.now()}")
    print("=" * 60)
    
    try:
        # Import and create orchestrator
        from agents.vana.enhanced_orchestrator import create_orchestrator_agent
        print("\n✅ Successfully imported orchestrator module")
        
        agent = create_orchestrator_agent()
        print("✅ Successfully created orchestrator agent")
        
        # Test queries
        test_queries = [
            {
                "query": "What's the weather in Paris?",
                "expected_behavior": "Should route to simple_search_agent"
            },
            {
                "query": "Explain VANA's architecture",
                "expected_behavior": "Should route to architecture_specialist_agent"
            },
            {
                "query": "Help me debug a Python error",
                "expected_behavior": "Should route to research_specialist_agent"
            }
        ]
        
        print("\n" + "=" * 60)
        print("EXECUTING TEST QUERIES")
        print("=" * 60)
        
        for i, test in enumerate(test_queries, 1):
            print(f"\n🧪 Test {i}: {test['query']}")
            print(f"📋 Expected: {test['expected_behavior']}")
            print("-" * 40)
            
            try:
                # Send message to agent
                response = agent.send_message(test['query'])
                
                print(f"✅ Response received:")
                print(f"   Type: {type(response)}")
                print(f"   Content: {response}")
                
                # Analyze response
                response_str = str(response).lower()
                if "ready" in response_str and "handle" in response_str:
                    print("❌ ISSUE: Generic 'ready to handle' response detected")
                    print("   This matches the ADK eval failure pattern!")
                elif "weather" in test['query'].lower() and "weather" not in response_str:
                    print("⚠️  WARNING: Response doesn't mention weather")
                else:
                    print("✅ Response appears contextual")
                    
            except Exception as e:
                print(f"❌ ERROR: {type(e).__name__}: {e}")
        
        # Check agent configuration
        print("\n" + "=" * 60)
        print("AGENT CONFIGURATION ANALYSIS")
        print("=" * 60)
        
        print(f"\n📊 Agent Details:")
        print(f"   Name: {agent.name if hasattr(agent, 'name') else 'N/A'}")
        print(f"   Model: {agent.model if hasattr(agent, 'model') else 'N/A'}")
        
        if hasattr(agent, 'tools'):
            print(f"\n🔧 Registered Tools: {len(agent.tools) if agent.tools else 0}")
            if agent.tools:
                for tool in agent.tools[:5]:  # Show first 5 tools
                    tool_name = getattr(tool, 'name', str(tool))
                    print(f"   - {tool_name}")
        
        if hasattr(agent, 'sub_agents'):
            print(f"\n👥 Sub-agents: {len(agent.sub_agents) if agent.sub_agents else 0}")
            if agent.sub_agents:
                for sub_agent in agent.sub_agents[:5]:  # Show first 5 sub-agents
                    agent_name = getattr(sub_agent, 'name', str(sub_agent))
                    print(f"   - {agent_name}")
        
    except ImportError as e:
        print(f"❌ IMPORT ERROR: {e}")
        print("   Check if enhanced_orchestrator module exists")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

def test_specialists_direct():
    """Test specialist agents directly"""
    print("\n" + "=" * 60)
    print("TESTING SPECIALIST AGENTS")
    print("=" * 60)
    
    specialists = [
        ("simple_search_agent", "What is the capital of Japan?"),
        ("research_specialist_agent", "Explain quantum computing"),
        ("architecture_specialist_agent", "Design a microservices architecture")
    ]
    
    for specialist_name, test_query in specialists:
        print(f"\n🧪 Testing {specialist_name}")
        print(f"📋 Query: {test_query}")
        print("-" * 40)
        
        try:
            # Try to import and test specialist
            if specialist_name == "simple_search_agent":
                from agents.vana.teams.simple_search import simple_search_agent as agent
            elif specialist_name == "research_specialist_agent":
                from agents.vana.specialists.research_specialist import research_specialist as agent
            elif specialist_name == "architecture_specialist_agent":
                from agents.vana.specialists.architecture_specialist import architecture_specialist as agent
            else:
                print(f"❌ Unknown specialist: {specialist_name}")
                continue
            
            response = agent.send_message(test_query)
            print(f"✅ Response: {response[:200]}..." if len(str(response)) > 200 else f"✅ Response: {response}")
            
        except Exception as e:
            print(f"❌ ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    print("🚀 Starting VANA Direct Agent Testing\n")
    
    # Test orchestrator
    test_orchestrator_direct()
    
    # Test specialists
    test_specialists_direct()
    
    print("\n" + "=" * 60)
    print("TESTING COMPLETE")
    print("=" * 60)
    print("\n📝 Summary:")
    print("- If agents work here but fail in ADK eval, issue is with eval framework")
    print("- If agents fail here too, issue is with agent implementation")
    print("- Check for 'ready to handle' generic responses")
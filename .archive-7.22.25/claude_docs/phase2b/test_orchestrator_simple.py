#!/usr/bin/env python3
"""Simple direct test of VANA orchestrator using ADK patterns"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def test_orchestrator():
    """Test the orchestrator with basic queries"""
    print("=" * 60)
    print("VANA Orchestrator Direct Test")
    print("=" * 60)
    
    try:
        # Import and create orchestrator
        from agents.vana.orchestrator_pure_delegation import create_pure_delegation_orchestrator
        orchestrator = create_pure_delegation_orchestrator()
        
        print(f"\n✅ Orchestrator created:")
        print(f"   Name: {orchestrator.name}")
        print(f"   Model: {orchestrator.model}")
        print(f"   Sub-agents: {len(orchestrator.sub_agents) if hasattr(orchestrator, 'sub_agents') else 'None'}")
        
        # Test query
        test_query = "What's the weather in Paris?"
        print(f"\n🧪 Testing query: '{test_query}'")
        print("-" * 40)
        
        # Send message using ADK agent interface
        response = orchestrator.send_message(test_query)
        
        print(f"\n📤 Response:")
        print(response)
        
        # Analyze response
        print(f"\n📊 Analysis:")
        response_str = str(response).lower()
        
        if "handle the requests as specified" in response_str:
            print("❌ FOUND THE BUG! Orchestrator received system instruction instead of user query")
            print("   This matches the ADK eval failure pattern exactly!")
        elif "ready to handle" in response_str:
            print("❌ Generic 'ready to handle' response - not processing actual query")
        elif "weather" in response_str or "paris" in response_str:
            print("✅ Response addresses the weather query")
        else:
            print("⚠️  Response doesn't clearly address the query")
            
        # Test another query
        test_query2 = "Explain VANA's architecture"
        print(f"\n🧪 Testing query: '{test_query2}'")
        print("-" * 40)
        
        response2 = orchestrator.send_message(test_query2)
        print(f"\n📤 Response:")
        print(response2)
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_orchestrator()
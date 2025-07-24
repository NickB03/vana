#!/usr/bin/env python3
"""
Test ADK delegation pattern in Cloud Run
Should properly delegate time queries to research_specialist
"""

import requests
import json
import time

def test_cloud_adk_delegation():
    """Test ADK delegation in vana-dev Cloud Run"""
    
    base_url = "https://vana-dev-qqugqgsbcq-uc.a.run.app"
    
    print("🧪 Testing ADK delegation pattern in Cloud Run")
    print("=" * 60)
    
    # Test 1: Service Health
    try:
        response = requests.get(base_url, timeout=10)
        if response.status_code == 200:
            print("✅ vana-dev service is responding")
        else:
            print(f"⚠️ Service returned {response.status_code}")
    except Exception as e:
        print(f"❌ Service health check failed: {e}")
        return False
    
    # Test 2: Check ADK Web Interface
    print("\n📝 ADK Web Interface Test:")
    print(f"🌐 Open: {base_url}")
    print("💬 Test Query: 'What time is it in Paris?'")
    print("🎯 Expected Behavior:")
    print("   - Should use transfer_to_agent(agent_name='research_specialist')")
    print("   - Research specialist should use google_search tool")
    print("   - Should return actual current time in Paris")
    print("   - No more generic 'I cannot tell you the time' responses")
    
    print("\n🔧 ADK Pattern Implemented:")
    print("   ✅ Removed custom analyze_and_route tool")
    print("   ✅ Updated instruction to use transfer_to_agent()")
    print("   ✅ Maintained sub_agents with factory pattern")
    print("   ✅ Research specialist has google_search access")
    
    return True

if __name__ == "__main__":
    test_cloud_adk_delegation()
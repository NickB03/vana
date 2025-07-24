#!/usr/bin/env python3
"""
Minimal test to verify orchestrator can route a simple query.
This bypasses ADK eval framework to test core functionality.
"""

import requests
import json

def test_orchestrator_api():
    """Test orchestrator through the running API."""
    base_url = "http://localhost:8081"
    
    print("🧪 Testing VANA Orchestrator via API")
    print("=" * 50)
    
    # Create session
    session_data = {
        "user": "test_user",
        "session": "test_session_123"
    }
    
    print("1️⃣ Creating session...")
    session_url = f"{base_url}/apps/vana/users/{session_data['user']}/sessions/{session_data['session']}"
    
    # Send test query
    query_data = {
        "query": "What's the weather in Paris?"
    }
    
    print(f"2️⃣ Sending query: {query_data['query']}")
    
    try:
        response = requests.post(session_url, json=query_data)
        print(f"3️⃣ Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"4️⃣ Response: {json.dumps(result, indent=2)}")
            
            # Check if correct specialist was used
            if "simple" in str(result).lower() or "search" in str(result).lower():
                print("✅ Appears to have routed to search specialist")
            else:
                print("❌ May have routed to wrong specialist")
        else:
            print(f"❌ Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_orchestrator_api()
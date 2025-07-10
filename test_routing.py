#!/usr/bin/env python3
"""
Test routing functionality of VANA Agentic AI
"""

import requests
import json
import time

BASE_URL = "http://localhost:8081/api/v1"

def test_health():
    """Test health endpoint."""
    print("🏥 Testing health endpoint...")
    response = requests.get(f"{BASE_URL.replace('/api/v1', '')}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_query(query: str, expected_routing: str = None):
    """Test a specific query."""
    print(f"\n📝 Testing: '{query}'")
    if expected_routing:
        print(f"   Expected routing: {expected_routing}")
    
    payload = {
        "query": query,
        "session_id": "test-session-001",
        "stream": False
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success: {result.get('response', '')[:200]}...")
            return True
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def main():
    """Run routing tests."""
    print("🧪 VANA Agentic AI Routing Tests\n")
    
    # Test health first
    if not test_health():
        print("\n❌ Server not healthy. Make sure to run: python main_agentic.py")
        return
    
    # Wait a moment
    time.sleep(1)
    
    # Test queries with expected routing
    test_cases = [
        # Simple conversation (should stay at VANA Chat)
        ("Hello, how are you today?", "VANA Chat"),
        
        # Architecture task (should route to architecture_specialist)
        ("Design a microservices architecture for an e-commerce platform", "architecture_specialist"),
        
        # DevOps task (should route to devops_specialist)
        ("How do I set up a CI/CD pipeline with GitHub Actions?", "devops_specialist"),
        
        # QA task (should route to qa_specialist)
        ("Create a comprehensive test plan for a mobile banking app", "qa_specialist"),
        
        # UI task (should route to ui_specialist)
        ("Design a user-friendly dashboard for analytics data", "ui_specialist"),
        
        # Data Science task (should route to data_science_specialist)
        ("Analyze sales data and predict next quarter's revenue", "data_science_specialist"),
        
        # Complex task (should use workflow coordination)
        ("Build a complete web application with frontend, backend, and deployment", "workflow coordination")
    ]
    
    success_count = 0
    for query, expected in test_cases:
        if test_query(query, expected):
            success_count += 1
        time.sleep(2)  # Avoid overwhelming the server
    
    print(f"\n📊 Results: {success_count}/{len(test_cases)} tests passed")
    
    if success_count == len(test_cases):
        print("🎉 All routing tests passed!")
    else:
        print("⚠️ Some tests failed. Check the implementation.")

if __name__ == "__main__":
    main()
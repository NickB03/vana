#!/usr/bin/env python3
"""Test VANA agents deployed on Cloud Run"""

import requests
import json
import time
from datetime import datetime

# Cloud Run URL
CLOUD_RUN_URL = "https://vana-dev-qqugqgsbcq-uc.a.run.app"

def test_cloud_run_health():
    """Test if Cloud Run deployment is accessible"""
    print("=" * 60)
    print("VANA Cloud Run Deployment Test")
    print(f"URL: {CLOUD_RUN_URL}")
    print(f"Date: {datetime.now()}")
    print("=" * 60)
    
    # Test health endpoint
    print("\n1. Testing health/root endpoint...")
    try:
        response = requests.get(f"{CLOUD_RUN_URL}/", timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        
        if response.status_code == 200:
            print("   ✅ Cloud Run deployment is accessible")
        else:
            print(f"   ❌ Unexpected status code: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {type(e).__name__}: {e}")
        return False
    
    return True

def create_session(app_name="vana_orchestrator", user_id="test_user", session_id=None):
    """Create a session on Cloud Run"""
    if session_id is None:
        session_id = f"test_session_{int(time.time())}"
    
    print(f"\n2. Creating session: {session_id}")
    
    url = f"{CLOUD_RUN_URL}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
    data = {"state": {}}
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            print(f"   ✅ Session created successfully")
            result = response.json()
            print(f"   Session ID: {result.get('id', 'N/A')}")
            return session_id
        else:
            print(f"   ❌ Failed to create session")
            print(f"   Response: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Error: {type(e).__name__}: {e}")
        return None

def test_agent_query(session_id, app_name="vana_orchestrator", user_id="test_user"):
    """Test agent with a query"""
    print(f"\n3. Testing agent with query...")
    
    # Test queries
    test_queries = [
        {
            "query": "What's the weather in Paris?",
            "expected": "simple_search_agent routing"
        },
        {
            "query": "Explain VANA's architecture",
            "expected": "architecture_specialist routing"
        }
    ]
    
    for i, test in enumerate(test_queries, 1):
        print(f"\n   Test {i}: {test['query']}")
        print(f"   Expected: {test['expected']}")
        print("   " + "-" * 40)
        
        url = f"{CLOUD_RUN_URL}/run"
        data = {
            "appName": app_name,
            "userId": user_id,
            "sessionId": session_id,
            "newMessage": {
                "role": "user",
                "parts": [{"text": test['query']}]
            }
        }
        
        try:
            # Send query
            start_time = time.time()
            response = requests.post(url, json=data, timeout=30)
            elapsed = time.time() - start_time
            
            print(f"   Status: {response.status_code}")
            print(f"   Response time: {elapsed:.2f}s")
            
            if response.status_code == 200:
                events = response.json()
                print(f"   Events received: {len(events)}")
                
                # Analyze events
                final_text = None
                tool_calls = []
                
                for event in events:
                    # Check for text responses
                    if 'content' in event and event['content'].get('parts'):
                        for part in event['content']['parts']:
                            if 'text' in part:
                                final_text = part['text']
                            elif 'functionCall' in part:
                                tool_calls.append(part['functionCall']['name'])
                
                # Print findings
                if tool_calls:
                    print(f"   🔧 Tool calls: {', '.join(tool_calls)}")
                
                if final_text:
                    print(f"   📝 Final response preview: {final_text[:150]}...")
                    
                    # Check for known issues
                    if "handle the requests as specified" in final_text.lower():
                        print("   ❌ BUG CONFIRMED: System instruction issue in Cloud Run!")
                    elif "ready to handle" in final_text.lower():
                        print("   ❌ Generic response - delegation failed")
                    elif test['query'].lower() in final_text.lower():
                        print("   ✅ Response addresses the query")
                    else:
                        print("   ⚠️  Response may not address query")
                else:
                    print("   ❌ No text response received")
                    
            else:
                print(f"   ❌ Query failed")
                print(f"   Response: {response.text[:200]}...")
                
        except requests.Timeout:
            print(f"   ❌ Request timed out (>30s)")
        except Exception as e:
            print(f"   ❌ Error: {type(e).__name__}: {e}")

def test_adk_eval_endpoint(session_id, app_name="vana_orchestrator"):
    """Test if Cloud Run has ADK eval endpoints"""
    print(f"\n4. Testing ADK eval compatibility...")
    
    # Try ADK eval endpoint format
    url = f"{CLOUD_RUN_URL}/eval"
    
    try:
        response = requests.get(url, timeout=10)
        print(f"   Eval endpoint status: {response.status_code}")
        
        if response.status_code == 404:
            print("   ℹ️  No dedicated eval endpoint (expected for standard deployment)")
        else:
            print(f"   Response: {response.text[:100]}...")
    except Exception as e:
        print(f"   Error checking eval endpoint: {e}")

def main():
    """Run all Cloud Run tests"""
    print("🚀 Starting VANA Cloud Run Testing\n")
    
    # Test health
    if not test_cloud_run_health():
        print("\n❌ Cloud Run deployment not accessible. Exiting.")
        return
    
    # Create session
    session_id = create_session()
    if not session_id:
        print("\n❌ Failed to create session. Exiting.")
        return
    
    # Test queries
    test_agent_query(session_id)
    
    # Test eval endpoint
    test_adk_eval_endpoint(session_id)
    
    print("\n" + "=" * 60)
    print("CLOUD RUN TEST SUMMARY")
    print("=" * 60)
    print("\n📊 Key Findings:")
    print("- Check if orchestrator receives actual queries or system instructions")
    print("- Verify if delegation to specialists works")
    print("- Compare behavior with local ADK eval tests")
    print("- API key should be configured in Cloud Run environment")

if __name__ == "__main__":
    main()
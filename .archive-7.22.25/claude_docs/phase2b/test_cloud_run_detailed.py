#!/usr/bin/env python3
"""Detailed Cloud Run testing with better error handling"""

import requests
import json
import time
from datetime import datetime

CLOUD_RUN_URL = "https://vana-dev-qqugqgsbcq-uc.a.run.app"

def test_cloud_run_detailed():
    """More detailed Cloud Run testing"""
    print("=" * 60)
    print("VANA Cloud Run Detailed Test")
    print(f"URL: {CLOUD_RUN_URL}")
    print(f"Date: {datetime.now()}")
    print("=" * 60)
    
    # Test 1: Check logs endpoint if available
    print("\n1. Checking for logs/debug endpoints...")
    for endpoint in ["/logs", "/debug", "/health", "/api/health"]:
        try:
            url = f"{CLOUD_RUN_URL}{endpoint}"
            response = requests.get(url, timeout=5)
            print(f"   {endpoint}: {response.status_code}")
            if response.status_code != 404:
                print(f"      Response: {response.text[:100]}...")
        except Exception as e:
            print(f"   {endpoint}: Error - {type(e).__name__}")
    
    # Test 2: Try different app names
    print("\n2. Testing different app name variations...")
    app_names = [
        "vana_orchestrator",
        "vana-orchestrator", 
        "orchestrator",
        "vana",
        "enhanced_orchestrator",
        "orchestrator_pure_delegation"
    ]
    
    user_id = "test_user"
    session_id = f"test_{int(time.time())}"
    
    for app_name in app_names:
        print(f"\n   Trying app name: '{app_name}'")
        url = f"{CLOUD_RUN_URL}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
        
        try:
            response = requests.post(url, json={"state": {}}, timeout=5)
            print(f"      Session creation: {response.status_code}")
            
            if response.status_code in [200, 201]:
                print(f"      ✅ SUCCESS with app name: '{app_name}'")
                
                # Try a query with this app name
                query_url = f"{CLOUD_RUN_URL}/run"
                query_data = {
                    "appName": app_name,
                    "userId": user_id,
                    "sessionId": session_id,
                    "newMessage": {
                        "role": "user",
                        "parts": [{"text": "Hello, are you working?"}]
                    }
                }
                
                query_response = requests.post(query_url, json=query_data, timeout=10)
                print(f"      Query test: {query_response.status_code}")
                
                if query_response.status_code == 200:
                    events = query_response.json()
                    print(f"      Events: {len(events)}")
                    
                    # Check for error events
                    for event in events:
                        if 'error' in event:
                            print(f"      ❌ Error in event: {event['error']}")
                        elif 'content' in event and 'parts' in event['content']:
                            for part in event['content']['parts']:
                                if 'text' in part:
                                    text = part['text']
                                    print(f"      Text response: {text[:100]}...")
                                    
                                    # Check for error patterns
                                    if "error" in text.lower():
                                        print(f"      ⚠️  Error mentioned in response")
                                    elif "500" in text or "internal" in text.lower():
                                        print(f"      ⚠️  Internal error mentioned")
                else:
                    try:
                        error_detail = query_response.json()
                        print(f"      Error detail: {error_detail}")
                    except:
                        print(f"      Error response: {query_response.text[:200]}...")
                
                # Don't test other app names if we found one that works
                break
                
        except Exception as e:
            print(f"      Error: {type(e).__name__}: {str(e)[:100]}")
    
    # Test 3: Check Cloud Run logs suggestion
    print("\n3. Cloud Run Debugging Info:")
    print("   To view Cloud Run logs, run:")
    print(f"   gcloud run services logs read vana-dev --region=us-central1 --limit=50")
    print("\n   To stream logs in real-time:")
    print(f"   gcloud run services logs tail vana-dev --region=us-central1")
    
    # Test 4: Check service configuration
    print("\n4. To check service configuration:")
    print("   gcloud run services describe vana-dev --region=us-central1")
    
    print("\n" + "=" * 60)
    print("ANALYSIS")
    print("=" * 60)
    print("\n🔍 Key Issues Found:")
    print("1. Cloud Run returns 500 Internal Server Error for queries")
    print("2. This suggests the orchestrator is failing at runtime")
    print("3. Likely causes:")
    print("   - API key not set in Cloud Run environment")
    print("   - Agent initialization failing")
    print("   - Import/dependency issues in Cloud Run")
    print("\n💡 Next Steps:")
    print("1. Check Cloud Run logs for specific error")
    print("2. Verify GOOGLE_API_KEY is set in Cloud Run")
    print("3. Check if all dependencies are properly deployed")

if __name__ == "__main__":
    test_cloud_run_detailed()
#!/usr/bin/env python3
"""Test Cloud Run with correct app name based on module structure"""

import requests
import json
import time
from datetime import datetime

CLOUD_RUN_URL = "https://vana-dev-qqugqgsbcq-uc.a.run.app"

def test_with_correct_app_name():
    """Test using the correct app name that matches the module structure"""
    print("=" * 60)
    print("Cloud Run Test - Correct App Name")
    print(f"URL: {CLOUD_RUN_URL}")
    print(f"Date: {datetime.now()}")
    print("=" * 60)
    
    # Based on the module structure, the app name should be 'agents.vana'
    # since the root_agent is in agents/vana/__init__.py
    app_names_to_try = [
        "agents.vana",      # Full module path
        "agents",           # Parent module
        "vana",             # Just the vana part
        "orchestrator_pure_delegation",  # The actual file name
        "root_agent"        # The exported agent name
    ]
    
    user_id = "test_user"
    session_id = f"test_{int(time.time())}"
    
    for app_name in app_names_to_try:
        print(f"\n🧪 Testing app name: '{app_name}'")
        
        # Try to create session
        session_url = f"{CLOUD_RUN_URL}/apps/{app_name}/users/{user_id}/sessions/{session_id}"
        
        try:
            response = requests.post(session_url, json={"state": {}}, timeout=10)
            print(f"   Session creation: {response.status_code}")
            
            if response.status_code in [200, 201]:
                print(f"   ✅ SUCCESS! App name '{app_name}' works!")
                
                # Now test a query
                print(f"\n   Testing query with app name '{app_name}'...")
                query_url = f"{CLOUD_RUN_URL}/run"
                query_data = {
                    "appName": app_name,
                    "userId": user_id,
                    "sessionId": session_id,
                    "newMessage": {
                        "role": "user",
                        "parts": [{"text": "What's the weather in Tokyo?"}]
                    }
                }
                
                query_response = requests.post(query_url, json=query_data, timeout=30)
                print(f"   Query status: {query_response.status_code}")
                
                if query_response.status_code == 200:
                    events = query_response.json()
                    print(f"   ✅ Query successful! Events: {len(events)}")
                    
                    # Analyze response
                    for event in events:
                        if 'content' in event and 'parts' in event['content']:
                            for part in event['content']['parts']:
                                if 'text' in part:
                                    text = part['text']
                                    print(f"\n   📝 Response from {event.get('author', 'Unknown')}:")
                                    print(f"      {text[:150]}...")
                                    
                                    # Check for issues
                                    if "handle the requests as specified" in text.lower():
                                        print("      ❌ BUG CONFIRMED: System instruction issue!")
                                    elif "ready to handle" in text.lower():
                                        print("      ❌ Generic response detected")
                                    elif "weather" in text.lower() or "tokyo" in text.lower():
                                        print("      ✅ Response addresses the query!")
                                        
                                elif 'functionCall' in part:
                                    func_call = part['functionCall']
                                    print(f"   🔧 Function call: {func_call.get('name', 'Unknown')}")
                                    if 'args' in func_call:
                                        print(f"      Args: {func_call['args']}")
                    
                    return app_name  # Return the working app name
                    
                else:
                    print(f"   ❌ Query failed: {query_response.status_code}")
                    try:
                        error = query_response.json()
                        print(f"   Error: {error}")
                    except:
                        print(f"   Error: {query_response.text[:200]}")
            
            elif response.status_code == 404:
                print(f"   ❌ App name not found")
            else:
                print(f"   ❌ Unexpected status: {response.text[:100]}")
                
        except Exception as e:
            print(f"   ❌ Error: {type(e).__name__}: {str(e)[:100]}")
    
    return None

def main():
    print("🚀 Testing Cloud Run with Correct Module Structure\n")
    
    working_app_name = test_with_correct_app_name()
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if working_app_name:
        print(f"\n✅ Found working app name: '{working_app_name}'")
        print("\nNext steps:")
        print("1. Use this app name for all future Cloud Run tests")
        print("2. Check if the orchestrator delegation works properly")
        print("3. Compare with local ADK eval behavior")
    else:
        print("\n❌ No working app name found")
        print("\nPossible issues:")
        print("1. Module not deployed correctly")
        print("2. ADK loader expects different structure")
        print("3. Need to check deployment configuration")

if __name__ == "__main__":
    main()
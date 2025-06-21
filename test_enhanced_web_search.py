#!/usr/bin/env python3
"""
Test script for enhanced web search tool functionality
Tests both local and deployed environments
"""

import json
import os
import sys
import requests
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_local_web_search():
    """Test the enhanced web search tool locally."""
    print("🧪 Testing Enhanced Web Search Tool Locally...")
    
    try:
        from lib._tools.adk_tools import web_search
        
        # Test with a time query
        print("\n🕐 Testing time query...")
        time_result = web_search("what time is it in Paris")
        print(f"Time query result length: {len(time_result)} characters")
        
        # Parse and analyze the result
        try:
            parsed_result = json.loads(time_result)
            print(f"✅ Valid JSON response")
            
            # Check for enhanced fields
            print(f"📊 Response structure:")
            print(f"   - Query: {parsed_result.get('query', 'N/A')}")
            print(f"   - Results count: {len(parsed_result.get('results', []))}")
            print(f"   - Has infobox: {'infobox' in parsed_result and bool(parsed_result['infobox'])}")
            print(f"   - Has FAQ: {'faq' in parsed_result and bool(parsed_result['faq'])}")
            print(f"   - Has summarizer: {'summarizer' in parsed_result and bool(parsed_result['summarizer'])}")
            
            # Check individual result fields
            if parsed_result.get('results'):
                first_result = parsed_result['results'][0]
                print(f"📄 First result enhanced fields:")
                print(f"   - Has extra_snippets: {bool(first_result.get('extra_snippets'))}")
                print(f"   - Has summary: {bool(first_result.get('summary'))}")
                print(f"   - Has age: {bool(first_result.get('age'))}")
                print(f"   - Has relevance_score: {bool(first_result.get('relevance_score'))}")
                print(f"   - Has language: {bool(first_result.get('language'))}")
            
            return True, parsed_result
            
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON response: {e}")
            print(f"Raw response: {time_result[:500]}...")
            return False, time_result
            
    except Exception as e:
        print(f"❌ Local web search test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, str(e)

def test_deployed_web_search():
    """Test the enhanced web search tool in deployed environment."""
    print("\n🌐 Testing Enhanced Web Search Tool in vana-dev...")

    try:
        # Test health endpoint first
        health_url = "https://vana-dev-960076421399.us-central1.run.app/health"
        health_response = requests.get(health_url, timeout=10)

        if health_response.status_code == 200:
            health_data = health_response.json()
            print(f"✅ vana-dev is healthy: {health_data}")
        else:
            print(f"❌ vana-dev health check failed: {health_response.status_code}")
            return False, None

        # Try Google ADK session-based approach with correct API structure
        print(f"\n🔍 Testing Google ADK session-based approach...")

        # Step 1: Create session using correct endpoint
        app_name = "vana"
        user_id = "test_user"
        session_url = f"https://vana-dev-960076421399.us-central1.run.app/apps/{app_name}/users/{user_id}/sessions"

        try:
            print(f"   📤 Creating session...")
            session_response = requests.post(session_url, json={}, timeout=15)

            if session_response.status_code == 200:
                session_data = session_response.json()
                session_id = session_data.get("id")
                print(f"   ✅ Session created: {session_id}")

                # Step 2: Send message with session using correct AgentRunRequest format
                run_url = "https://vana-dev-960076421399.us-central1.run.app/run"
                message_payload = {
                    "appName": app_name,
                    "userId": user_id,
                    "sessionId": session_id,
                    "newMessage": {
                        "parts": [{"text": "What time is it in Paris right now?"}],
                        "role": "user"
                    },
                    "streaming": False
                }

                print(f"   📤 Sending message to agent...")
                message_response = requests.post(run_url, json=message_payload, timeout=45)

                if message_response.status_code == 200:
                    response_data = message_response.json()
                    print(f"   ✅ SUCCESS! Agent responded")
                    print(f"   📄 Response preview: {str(response_data)[:500]}...")

                    # Extract the actual agent response text
                    if isinstance(response_data, list) and len(response_data) > 0:
                        for event in response_data:
                            if event.get("content") and event.get("content", {}).get("parts"):
                                parts = event["content"]["parts"]
                                for part in parts:
                                    if part.get("text"):
                                        print(f"   🤖 Agent response: {part['text'][:200]}...")
                                        break

                    return True, response_data
                else:
                    print(f"   ❌ Message failed: HTTP {message_response.status_code}")
                    print(f"   📄 Error: {message_response.text[:200]}")

            else:
                print(f"   ❌ Session creation failed: HTTP {session_response.status_code}")
                print(f"   📄 Error: {session_response.text[:200]}")

        except Exception as e:
            print(f"   ❌ Session-based approach failed: {str(e)[:100]}")

        print(f"\n❌ Google ADK session approach failed")
        return False, "Session-based approach failed"

    except Exception as e:
        print(f"❌ Deployed web search test failed: {e}")
        import traceback
        traceback.print_exc()
        return False, str(e)

def main():
    """Run all tests."""
    print("🚀 Enhanced Web Search Tool Testing")
    print("=" * 50)
    
    # Test local environment
    local_success, local_result = test_local_web_search()
    
    # Test deployed environment
    deployed_success, deployed_result = test_deployed_web_search()
    
    # Summary
    print("\n📊 Test Summary:")
    print(f"   Local test: {'✅ PASSED' if local_success else '❌ FAILED'}")
    print(f"   Deployed test: {'✅ PASSED' if deployed_success else '❌ FAILED'}")
    
    if local_success and deployed_success:
        print("\n🎉 All tests passed! Enhanced web search tool is working.")
    else:
        print("\n⚠️ Some tests failed. Enhanced web search tool needs investigation.")
    
    return local_success and deployed_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

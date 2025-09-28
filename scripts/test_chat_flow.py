#!/usr/bin/env python3
"""Test complete chat flow with authentication"""

import requests
import json
import uuid
import time

BASE_URL = "http://127.0.0.1:8000"

def test_chat_flow():
    """Test complete flow: login -> start chat -> get SSE stream"""

    # Step 1: Login
    print("1. Testing login...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "test@test.com", "username": "testuser", "password": "Test123!"}
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return False

    auth_data = login_response.json()
    access_token = auth_data["tokens"]["access_token"]
    print(f"✅ Login successful! User: {auth_data['user']['email']}")

    # Step 2: Test /api/auth/me endpoint
    print("\n2. Testing /api/auth/me...")
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)

    if me_response.status_code != 200:
        print(f"❌ /api/auth/me failed: {me_response.status_code}")
        print(me_response.text)
    else:
        user_info = me_response.json()
        print(f"✅ User info retrieved: {user_info['email']}")

    # Step 3: Test chat endpoint
    print("\n3. Testing /api/chat endpoint...")
    session_id = str(uuid.uuid4())
    chat_request = {
        "message": "What are the best practices for Python async programming?",
        "session_id": session_id
    }

    # First test the /api/chat endpoint
    chat_response = requests.post(
        f"{BASE_URL}/api/chat",
        json=chat_request,
        headers=headers,
        stream=True
    )

    if chat_response.status_code != 200:
        print(f"❌ Chat failed: {chat_response.status_code}")

        # Try to read error response
        try:
            error_text = chat_response.text
            print(f"   Error: {error_text[:200]}")
        except:
            pass
        return False

    print(f"✅ Chat endpoint reached! Status: {chat_response.status_code}")
    print(f"   Session ID: {session_id}")
    print("   Reading SSE stream...")

    try:
        # Read SSE events from chat response
        event_count = 0
        start_time = time.time()

        for line in chat_response.iter_lines():
            if time.time() - start_time > 10:  # Give it 10 seconds
                break

            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith('data:'):
                    event_count += 1
                    data = decoded_line[6:]  # Remove "data: " prefix

                    if data == "[DONE]":
                        print(f"   ✅ Stream completed!")
                        break

                    try:
                        msg = json.loads(data)
                        msg_type = msg.get('type', 'unknown')
                        msg_content = msg.get('content', '')[:100]
                        print(f"   Event {event_count} [{msg_type}]: {msg_content}")
                    except:
                        print(f"   Event {event_count}: {data[:100]}...")

        print(f"\n   Total events received: {event_count}")

    except requests.exceptions.Timeout:
        print("   Timeout after 5 seconds (normal for SSE)")
    except Exception as e:
        print(f"❌ SSE error: {e}")
        return False

    print("\n✅ All tests passed!")
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Vana Chat Flow with Authentication")
    print("=" * 60)

    success = test_chat_flow()

    print("\n" + "=" * 60)
    if success:
        print("✅ CHAT FLOW TEST SUCCESSFUL!")
    else:
        print("❌ CHAT FLOW TEST FAILED!")
    print("=" * 60)
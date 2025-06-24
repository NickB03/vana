#!/usr/bin/env python3
"""
Test ADK Endpoints for VANA Agent
=================================

Tests the actual ADK-generated endpoints to validate agent conversation capabilities.
"""

import json
import time

import requests

SERVICE_URL = "https://vana-dev-960076421399.us-central1.run.app"


def test_adk_endpoints():
    """Test ADK-generated endpoints"""
    print("🔍 Testing ADK Endpoints")
    print("=" * 40)

    # Test list apps
    try:
        response = requests.get(f"{SERVICE_URL}/list-apps", timeout=10)
        print(f"List apps: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Available apps: {data}")
    except Exception as e:
        print(f"List apps error: {e}")

    # Test info endpoint
    try:
        response = requests.get(f"{SERVICE_URL}/info", timeout=10)
        print(f"Info endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"App info: {json.dumps(data, indent=2)[:300]}...")
    except Exception as e:
        print(f"Info endpoint error: {e}")

    # Test dev-ui
    try:
        response = requests.get(f"{SERVICE_URL}/dev-ui", timeout=10)
        print(f"Dev UI: {response.status_code}")
    except Exception as e:
        print(f"Dev UI error: {e}")


def test_agent_conversation():
    """Test actual agent conversation through ADK"""
    print("\n🤖 Testing Agent Conversation")
    print("=" * 40)

    # Test direct run endpoint
    try:
        message_data = {
            "message": "Hello! What is 15 + 25 * 2? Please use your mathematical reasoning tool."
        }

        response = requests.post(f"{SERVICE_URL}/run", json=message_data, timeout=60)

        print(f"Run endpoint: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Agent response: {json.dumps(data, indent=2)[:500]}...")
        else:
            print(f"Error response: {response.text[:200]}...")

    except Exception as e:
        print(f"Run endpoint test error: {e}")

    # Test session-based conversation
    try:
        # Create session using correct ADK pattern
        session_data = {
            "user_id": "test_user",
            "session_id": f"test_session_{int(time.time())}",
        }

        app_name = "vana"  # Assuming app name is vana
        response = requests.post(
            f"{SERVICE_URL}/apps/{app_name}/users/{session_data['user_id']}/sessions",
            json=session_data,
            timeout=30,
        )

        print(f"Create session: {response.status_code}")
        if response.status_code in [200, 201]:
            print("Session created successfully")

            # Test conversation in session
            message_data = {"message": "What is 10 + 5 * 3?"}

            response = requests.post(
                f"{SERVICE_URL}/apps/{app_name}/users/{session_data['user_id']}/sessions/{session_data['session_id']}",
                json=message_data,
                timeout=60,
            )

            print(f"Session message: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Session response: {json.dumps(data, indent=2)[:300]}...")
            else:
                print(f"Session error: {response.text[:200]}...")
        else:
            print(f"Session creation failed: {response.text[:200]}...")

    except Exception as e:
        print(f"Session conversation test error: {e}")


if __name__ == "__main__":
    test_adk_endpoints()
    test_agent_conversation()

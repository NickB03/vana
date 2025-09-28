#!/usr/bin/env python3
"""Test ADK endpoint compliance and functionality."""

import requests
import json
from datetime import datetime
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(method, path, description, data=None, expected_status=200):
    """Test an endpoint and report results."""
    url = f"{BASE_URL}{path}"
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data or {})
        elif method == "PUT":
            response = requests.put(url, json=data or {})
        elif method == "DELETE":
            response = requests.delete(url)
        else:
            print(f"❌ Unknown method: {method}")
            return False

        success = response.status_code == expected_status
        status_icon = "✅" if success else "❌"

        print(f"{status_icon} [{method:6}] {path:60} - {description}")

        if not success:
            print(f"   Expected: {expected_status}, Got: {response.status_code}")
            if response.text:
                print(f"   Response: {response.text[:200]}")

        return success

    except Exception as e:
        print(f"❌ [{method:6}] {path:60} - {description}")
        print(f"   Error: {str(e)}")
        return False

def main():
    """Run ADK compliance tests."""
    print("\n" + "="*80)
    print("Google ADK Endpoint Compliance Test")
    print("="*80)
    print(f"Testing server at: {BASE_URL}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("-"*80)

    # Test data
    app_name = "vana"
    user_id = "test_user_123"
    session_id = "session_" + datetime.now().strftime("%Y%m%d%H%M%S") + "_test123"  # 20+ chars

    tests = [
        # Core ADK Endpoints
        ("GET", "/list-apps", "List all applications"),
        ("GET", f"/apps/{app_name}/users/{user_id}/sessions", "List user sessions"),
        ("POST", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/new", "Create new session"),
        ("POST", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/run", "Run action", {"action": "test"}),
        ("GET", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/state", "Get session state"),
        ("POST", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/state", "Update session state", {"key": "test", "value": "data"}),
        ("GET", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/memory", "Get session memory"),
        ("POST", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/memory", "Update memory", {"key": "test", "value": "data"}),
        ("GET", f"/apps/{app_name}/users/{user_id}/sessions/{session_id}/context", "Get context"),
        ("GET", f"/apps/{app_name}/users/{user_id}/cross-session-memory", "Get cross-session memory"),
        ("POST", f"/apps/{app_name}/users/{user_id}/cross-session-memory", "Update cross-session memory", {"key": "test", "value": "data"}),

        # Health and Debug
        ("GET", "/health", "Health check"),
        ("GET", "/debug/sessions", "Debug sessions"),
        ("GET", f"/debug/session/{session_id}", "Debug specific session"),

        # Legacy Endpoints (should show deprecation)
        ("POST", "/api/chat", "Legacy chat endpoint (deprecated)", {"message": "test"}, 200),
        ("GET", "/api/chat/session/test_session_id/status", "Legacy session status", None, 200),
    ]

    total = len(tests)
    passed = 0

    for test in tests:
        if test_endpoint(*test):
            passed += 1

    print("-"*80)
    print(f"Results: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")

    if passed == total:
        print("✅ Full ADK compliance achieved!")
    else:
        print(f"⚠️  {total - passed} endpoints need attention")

    print("="*80)

    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())
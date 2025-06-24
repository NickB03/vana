#!/usr/bin/env python3
"""
Test VANA Agent Specialist Delegation
Tests delegation to code execution and data science specialists
"""

import sys
import time

import requests

SERVICE_URL = "https://vana-dev-960076421399.us-central1.run.app"


def create_session():
    """Create a test session"""
    try:
        response = requests.post(
            f"{SERVICE_URL}/apps/vana/users/test-user/sessions", json={}, timeout=10
        )
        if response.status_code == 200:
            return response.json()["id"]
        else:
            return None
    except Exception as e:
        print(f"Session creation error: {e}")
        return None


def test_delegation(query: str, test_name: str, session_id: str):
    """Test agent delegation"""
    print(f"\n🧪 {test_name}")
    print(f"Query: {query}")

    try:
        payload = {
            "appName": "vana",
            "userId": "test-user",
            "sessionId": session_id,
            "newMessage": {"parts": [{"text": query}], "role": "user"},
        }

        start_time = time.time()
        response = requests.post(f"{SERVICE_URL}/run", json=payload, timeout=120)
        response_time = time.time() - start_time

        if response.status_code == 200:
            result = response.json()

            # Extract response text
            if isinstance(result, list) and len(result) > 0:
                last_item = result[-1]
                if isinstance(last_item, dict) and "content" in last_item:
                    content = last_item.get("content", {})
                    parts = content.get("parts", [])
                    if parts and "text" in parts[0]:
                        agent_response = parts[0]["text"]
                    else:
                        agent_response = str(last_item)
                else:
                    agent_response = str(last_item)
            else:
                agent_response = str(result)

            print(f"⏱️  Response time: {response_time:.2f}s")
            print(f"📝 Response length: {len(agent_response)} chars")

            # Analyze delegation indicators
            delegation_keywords = [
                "code execution",
                "specialist",
                "delegated",
                "executed",
                "ran",
                "python",
                "script",
                "program",
                "output",
                "result",
            ]

            found_keywords = [
                kw for kw in delegation_keywords if kw.lower() in agent_response.lower()
            ]

            print(f"🔍 Delegation indicators: {found_keywords[:3]}")
            print(
                f"📄 Response preview: {agent_response[:200]}{'...' if len(agent_response) > 200 else ''}"
            )

            return {
                "success": True,
                "response": agent_response,
                "response_time": response_time,
                "delegation_indicators": found_keywords,
            }
        else:
            print(f"❌ Request failed: {response.status_code}")
            return {"success": False, "error": f"HTTP {response.status_code}"}

    except Exception as e:
        print(f"❌ Test failed: {e}")
        return {"success": False, "error": str(e)}


def main():
    """Run specialist delegation tests"""
    print("🚀 VANA Specialist Delegation Test")
    print("=" * 50)

    # Create session
    session_id = create_session()
    if not session_id:
        print("❌ Could not create session")
        sys.exit(1)

    # Test cases for delegation
    test_cases = [
        {
            "query": "Write a Python function to calculate fibonacci numbers and run it with n=10",
            "name": "Code Execution Delegation",
            "expected_delegation": "code_execution",
        },
        {
            "query": "Create a simple Python script that generates random numbers and calculates their statistics",
            "name": "Data Science Delegation",
            "expected_delegation": "data_science",
        },
        {
            "query": 'Execute this Python code: print("Testing delegation:", 2+2)',
            "name": "Direct Code Execution",
            "expected_delegation": "code_execution",
        },
        {
            "query": "Analyze this dataset: [1,2,3,4,5,6,7,8,9,10] and provide basic statistics",
            "name": "Data Analysis Task",
            "expected_delegation": "data_science",
        },
    ]

    results = []
    for test_case in test_cases:
        result = test_delegation(test_case["query"], test_case["name"], session_id)
        result["expected_delegation"] = test_case["expected_delegation"]
        results.append(result)
        time.sleep(2)  # Brief pause

    # Analysis
    print("\n" + "=" * 50)
    print("📊 DELEGATION TEST RESULTS")
    print("=" * 50)

    successful_tests = [r for r in results if r["success"]]
    print(f"✅ Successful tests: {len(successful_tests)}/{len(results)}")

    if successful_tests:
        avg_time = sum(r["response_time"] for r in successful_tests) / len(
            successful_tests
        )
        print(f"⏱️  Average response time: {avg_time:.2f}s")

        # Check for delegation evidence
        delegated_responses = [
            r for r in successful_tests if len(r["delegation_indicators"]) > 0
        ]
        print(
            f"🔄 Responses with delegation evidence: {len(delegated_responses)}/{len(successful_tests)}"
        )

    # Detailed analysis
    for result in results:
        if result["success"]:
            indicators = len(result["delegation_indicators"])
            print(
                f"\n📋 {result.get('test_name', 'Unknown')}: {indicators} delegation indicators"
            )
        else:
            print(
                f"\n❌ {result.get('test_name', 'Unknown')}: Failed - {result.get('error')}"
            )

    return len(successful_tests) >= 3


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

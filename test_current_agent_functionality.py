#!/usr/bin/env python3
"""
Comprehensive VANA Agent Functionality Test
Tests the current simplified agent across all capabilities
"""

import json
import sys
import time
from typing import Any, Dict

import requests

# Current service URL
SERVICE_URL = "https://vana-dev-960076421399.us-central1.run.app"


def test_service_health():
    """Test basic service health"""
    print("🏥 Testing Service Health...")
    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status: {data.get('status')}")
            print(f"   🤖 Agent: {data.get('agent')}")
            print(f"   📊 Version: {data.get('version')}")
            return True
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Health check error: {e}")
        return False


def create_session():
    """Create a test session"""
    try:
        response = requests.post(
            f"{SERVICE_URL}/apps/vana/users/test-user/sessions", json={}, timeout=10
        )
        if response.status_code == 200:
            return response.json()["id"]
        else:
            print(f"   ❌ Session creation failed: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ❌ Session creation error: {e}")
        return None


def test_agent_interaction(
    query: str, test_name: str, session_id: str
) -> Dict[str, Any]:
    """Test agent interaction"""
    print(f"\n🧪 {test_name}")
    print(f"   Query: {query}")

    try:
        payload = {
            "appName": "vana",
            "userId": "test-user",
            "sessionId": session_id,
            "newMessage": {"parts": [{"text": query}], "role": "user"},
        }

        start_time = time.time()
        response = requests.post(f"{SERVICE_URL}/run", json=payload, timeout=60)
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

            print(f"   ⏱️  Response time: {response_time:.2f}s")
            print(f"   📝 Response length: {len(agent_response)} chars")
            print(
                f"   📄 Preview: {agent_response[:100]}{'...' if len(agent_response) > 100 else ''}"
            )

            return {
                "success": True,
                "response": agent_response,
                "response_time": response_time,
                "test_name": test_name,
            }
        else:
            print(f"   ❌ Request failed: {response.status_code}")
            print(f"   📄 Error: {response.text[:200]}")
            return {
                "success": False,
                "error": f"HTTP {response.status_code}",
                "test_name": test_name,
            }

    except Exception as e:
        print(f"   ❌ Test failed: {e}")
        return {"success": False, "error": str(e), "test_name": test_name}


def main():
    """Run comprehensive agent functionality tests"""
    print("🚀 VANA Agent Comprehensive Functionality Test")
    print("=" * 60)

    # Test 1: Service Health
    if not test_service_health():
        print("\n❌ Service unavailable - aborting tests")
        sys.exit(1)

    # Create session
    print("\n🔧 Creating test session...")
    session_id = create_session()
    if not session_id:
        print("❌ Could not create session - aborting tests")
        sys.exit(1)
    print(f"   ✅ Session created: {session_id}")

    # Test Cases
    test_cases = [
        {
            "query": "Hello! Are you working correctly?",
            "name": "Basic Conversation",
            "category": "conversation",
        },
        {
            "query": "What is 15 + 25 * 2? Please show your work.",
            "name": "Mathematical Reasoning",
            "category": "math",
        },
        {
            "query": "If all cats are animals, and Fluffy is a cat, what can we conclude about Fluffy?",
            "name": "Logical Reasoning",
            "category": "logic",
        },
        {
            "query": "Search the web for current information about Python 3.13 new features",
            "name": "Web Search",
            "category": "web_search",
        },
        {
            "query": 'Create a simple Python script that prints "Hello World" and save it to test_hello.py',
            "name": "File Creation",
            "category": "file_ops",
        },
        {
            "query": "Read the file test_hello.py that we just created",
            "name": "File Reading",
            "category": "file_ops",
        },
        {
            "query": 'Analyze this task: "Build a web scraper for product prices" and break it down into steps',
            "name": "Task Analysis",
            "category": "analysis",
        },
    ]

    # Run tests
    results = []
    total_response_time = 0

    for test_case in test_cases:
        result = test_agent_interaction(
            test_case["query"], test_case["name"], session_id
        )
        result["category"] = test_case["category"]
        results.append(result)

        if result["success"]:
            total_response_time += result.get("response_time", 0)

        time.sleep(1)  # Brief pause between tests

    # Analysis
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS ANALYSIS")
    print("=" * 60)

    successful_tests = [r for r in results if r["success"]]
    failed_tests = [r for r in results if not r["success"]]

    print(f"✅ Successful tests: {len(successful_tests)}/{len(results)}")
    print(f"❌ Failed tests: {len(failed_tests)}")

    if successful_tests:
        avg_response_time = total_response_time / len(successful_tests)
        print(f"⏱️  Average response time: {avg_response_time:.2f}s")

    # Category analysis
    categories = {}
    for result in results:
        cat = result["category"]
        if cat not in categories:
            categories[cat] = {"success": 0, "total": 0}
        categories[cat]["total"] += 1
        if result["success"]:
            categories[cat]["success"] += 1

    print("\n📋 Results by Category:")
    for cat, stats in categories.items():
        success_rate = (stats["success"] / stats["total"]) * 100
        print(f"   {cat}: {stats['success']}/{stats['total']} ({success_rate:.1f}%)")

    # Failed test details
    if failed_tests:
        print("\n❌ Failed Test Details:")
        for test in failed_tests:
            print(f"   • {test['test_name']}: {test.get('error', 'Unknown error')}")

    # Overall assessment
    success_rate = (len(successful_tests) / len(results)) * 100

    print("\n🎯 OVERALL ASSESSMENT")
    print(f"Success Rate: {success_rate:.1f}%")

    if success_rate >= 85:
        print("🎉 EXCELLENT: Agent is performing very well")
        status = "excellent"
    elif success_rate >= 70:
        print("✅ GOOD: Agent is performing adequately with minor issues")
        status = "good"
    elif success_rate >= 50:
        print("⚠️ FAIR: Agent has significant issues that need attention")
        status = "fair"
    else:
        print("❌ POOR: Agent has critical issues requiring immediate fixes")
        status = "poor"

    # Save detailed results
    report = {
        "timestamp": time.time(),
        "service_url": SERVICE_URL,
        "session_id": session_id,
        "total_tests": len(results),
        "successful_tests": len(successful_tests),
        "failed_tests": len(failed_tests),
        "success_rate": success_rate,
        "average_response_time": avg_response_time if successful_tests else 0,
        "status": status,
        "detailed_results": results,
        "category_analysis": categories,
    }

    with open("vana_functionality_test_report.json", "w") as f:
        json.dump(report, f, indent=2)

    print("\n📄 Detailed report saved to: vana_functionality_test_report.json")

    return success_rate >= 70


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

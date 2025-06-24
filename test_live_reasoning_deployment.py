#!/usr/bin/env python3
"""
Test Enhanced Reasoning in Live Cloud Deployment
Validates mathematical and logical reasoning capabilities work in the deployed service
"""

import sys
import time
from typing import Any, Dict

import requests

# Service URL for the deployed enhanced VANA
SERVICE_URL = "https://vana-dev-960076421399.us-central1.run.app"


def test_service_availability():
    """Test that the service is available and responding"""
    print("🔍 Testing service availability...")

    try:
        response = requests.get(f"{SERVICE_URL}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ Service healthy: {health_data.get('status')}")
            print(f"   📋 Version: {health_data.get('version', 'unknown')}")
            return True
        else:
            print(f"   ❌ Service unhealthy: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Service unavailable: {e}")
        return False


def test_enhanced_features():
    """Test that enhanced reasoning features are available"""
    print("\n🧠 Testing enhanced reasoning features availability...")

    try:
        response = requests.get(f"{SERVICE_URL}/version", timeout=10)
        if response.status_code == 200:
            version_data = response.json()
            enhanced_features = version_data.get("enhanced_features", {})

            print("   📊 Enhanced Features Status:")
            print(
                f"      • Reasoning tools: {enhanced_features.get('reasoning_tools', 'unknown')}"
            )
            print(
                f"      • Mathematical reasoning: {enhanced_features.get('mathematical_reasoning', False)}"
            )
            print(
                f"      • Logical reasoning: {enhanced_features.get('logical_reasoning', False)}"
            )
            print(
                f"      • Enhanced echo: {enhanced_features.get('enhanced_echo', False)}"
            )
            print(
                f"      • Enhanced task analysis: {enhanced_features.get('enhanced_task_analysis', False)}"
            )
            print(
                f"      • Reasoning coordination: {enhanced_features.get('reasoning_coordination', False)}"
            )

            # Validate all features are enabled
            required_features = [
                "mathematical_reasoning",
                "logical_reasoning",
                "enhanced_echo",
                "enhanced_task_analysis",
                "reasoning_coordination",
            ]

            all_features_enabled = all(
                enhanced_features.get(feature, False) for feature in required_features
            )
            reasoning_tools_count = enhanced_features.get("reasoning_tools", 0)

            if all_features_enabled and reasoning_tools_count == 5:
                print("   ✅ All enhanced reasoning features confirmed available")
                return True
            else:
                print("   ❌ Some enhanced reasoning features missing")
                return False
        else:
            print(f"   ❌ Failed to get version info: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Enhanced features check failed: {e}")
        return False


def test_agent_interaction(query: str, test_name: str) -> Dict[str, Any]:
    """Test agent interaction with a specific query"""
    print(f"\n🤖 Testing: {test_name}")
    print(f"   Query: {query}")

    try:
        # Create a session first
        app_name = "vana"
        user_id = "test-user-001"

        session_response = requests.post(
            f"{SERVICE_URL}/apps/{app_name}/users/{user_id}/sessions",
            json={},
            timeout=10,
        )

        if session_response.status_code != 200:
            return {
                "success": False,
                "error": f"Failed to create session: {session_response.text}",
            }

        session_data = session_response.json()
        session_id = session_data["id"]

        # Test via the agent endpoint with correct format
        payload = {
            "appName": app_name,
            "userId": user_id,
            "sessionId": session_id,
            "newMessage": {"parts": [{"text": query}], "role": "user"},
        }

        response = requests.post(f"{SERVICE_URL}/run", json=payload, timeout=30)

        if response.status_code == 200:
            result = response.json()
            print(f"   🔍 Raw response type: {type(result)}")
            print(f"   📄 Raw response: {str(result)[:200]}...")

            # Handle both dict and list responses
            if isinstance(result, list) and len(result) > 0:
                # If it's a list, get the last item (usually the final response)
                last_item = result[-1]
                if isinstance(last_item, dict) and "content" in last_item:
                    # Extract text from the content parts
                    content = last_item.get("content", {})
                    parts = content.get("parts", [])
                    if parts and "text" in parts[0]:
                        agent_response = parts[0]["text"]
                    else:
                        agent_response = str(last_item)
                else:
                    agent_response = str(last_item)
            elif isinstance(result, dict):
                agent_response = result.get("response", str(result))
            else:
                agent_response = str(result)

            print(f"   📤 Response received ({len(agent_response)} chars)")
            print(
                f"   📝 Response preview: {agent_response[:100]}{'...' if len(agent_response) > 100 else ''}"
            )

            return {"success": True, "response": agent_response, "full_result": result}
        else:
            print(f"   ❌ Agent request failed: HTTP {response.status_code}")
            print(f"   📄 Error: {response.text[:200]}")
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text[:200]}",
            }

    except Exception as e:
        print(f"   ❌ Agent interaction failed: {e}")
        return {"success": False, "error": str(e)}


def analyze_mathematical_reasoning(response: str) -> bool:
    """Analyze if the response shows mathematical reasoning capability"""
    # Look for mathematical indicators
    math_indicators = [
        "calculate",
        "math",
        "equation",
        "solve",
        "answer",
        "result",
        "+",
        "-",
        "*",
        "/",
        "=",
        "arithmetic",
        "mathematical",
    ]

    response_lower = response.lower()
    found_indicators = [
        indicator for indicator in math_indicators if indicator in response_lower
    ]

    # Look for actual numbers and calculations
    import re

    numbers = re.findall(r"\d+", response)
    calculations = re.findall(r"\d+\s*[+\-*/]\s*\d+", response)

    has_math_content = (
        len(found_indicators) >= 2 or len(numbers) >= 2 or len(calculations) >= 1
    )

    print(f"      🔍 Math indicators found: {found_indicators[:3]}")
    print(f"      🔢 Numbers found: {numbers[:5]}")
    print(f"      ➕ Calculations found: {calculations[:3]}")

    return has_math_content


def analyze_logical_reasoning(response: str) -> bool:
    """Analyze if the response shows logical reasoning capability"""
    # Look for logical reasoning indicators
    logic_indicators = [
        "if",
        "then",
        "because",
        "therefore",
        "logic",
        "reasoning",
        "conclusion",
        "analysis",
        "implies",
        "follows",
        "consequence",
    ]

    response_lower = response.lower()
    found_indicators = [
        indicator for indicator in logic_indicators if indicator in response_lower
    ]

    # Look for structured reasoning patterns
    structured_patterns = [
        "step",
        "first",
        "second",
        "next",
        "finally",
        "analysis",
        "reasoning",
    ]

    found_patterns = [
        pattern for pattern in structured_patterns if pattern in response_lower
    ]

    has_logic_content = len(found_indicators) >= 2 or len(found_patterns) >= 2

    print(f"      🧠 Logic indicators found: {found_indicators[:3]}")
    print(f"      📋 Structured patterns found: {found_patterns[:3]}")

    return has_logic_content


def main():
    """Run comprehensive reasoning tests on live deployment"""
    print("🚀 Enhanced VANA Live Reasoning Deployment Test")
    print("=" * 60)

    # Test 1: Service availability
    if not test_service_availability():
        print("\n❌ Service unavailable - aborting tests")
        sys.exit(1)

    # Test 2: Enhanced features availability
    if not test_enhanced_features():
        print("\n❌ Enhanced features not available - aborting tests")
        sys.exit(1)

    # Test 3: Mathematical reasoning
    print("\n" + "=" * 60)
    print("🔢 MATHEMATICAL REASONING TESTS")
    print("=" * 60)

    math_tests = [
        {
            "query": "What is 15 + 25 * 2?",
            "name": "Basic arithmetic with order of operations",
            "expected_answer": "65",
        },
        {
            "query": "Calculate the sum of 12 and 8, then multiply by 3",
            "name": "Multi-step word problem",
            "expected_answer": "60",
        },
        {
            "query": "If John has 10 apples and gives away 3, how many does he have left?",
            "name": "Simple word problem",
            "expected_answer": "7",
        },
    ]

    math_results = []
    for test in math_tests:
        result = test_agent_interaction(test["query"], test["name"])
        if result["success"]:
            has_math_reasoning = analyze_mathematical_reasoning(result["response"])
            # Check if expected answer appears in response
            has_correct_answer = test["expected_answer"] in result["response"]

            print(f"      ✅ Mathematical reasoning detected: {has_math_reasoning}")
            print(
                f"      🎯 Correct answer ({test['expected_answer']}) found: {has_correct_answer}"
            )

            math_results.append(
                {
                    "test": test["name"],
                    "success": True,
                    "has_reasoning": has_math_reasoning,
                    "has_answer": has_correct_answer,
                }
            )
        else:
            print(f"      ❌ Test failed: {result.get('error', 'Unknown error')}")
            math_results.append(
                {
                    "test": test["name"],
                    "success": False,
                    "has_reasoning": False,
                    "has_answer": False,
                }
            )

        time.sleep(2)  # Brief pause between tests

    # Test 4: Logical reasoning
    print("\n" + "=" * 60)
    print("🧠 LOGICAL REASONING TESTS")
    print("=" * 60)

    logic_tests = [
        {
            "query": "If it rains, then the ground gets wet. It is raining. What can we conclude?",
            "name": "Conditional logic reasoning",
            "expected_pattern": "ground.*wet",
        },
        {
            "query": "All birds can fly. Penguins are birds. Can penguins fly according to this logic?",
            "name": "Syllogistic reasoning with contradiction",
            "expected_pattern": "fly|logic|contradiction",
        },
        {
            "query": 'Analyze this statement: "If you study hard, you will pass the exam."',
            "name": "Logical statement analysis",
            "expected_pattern": "conditional|if.*then|implication",
        },
    ]

    logic_results = []
    for test in logic_tests:
        result = test_agent_interaction(test["query"], test["name"])
        if result["success"]:
            has_logic_reasoning = analyze_logical_reasoning(result["response"])

            # Check if expected logical pattern appears in response
            import re

            has_expected_pattern = bool(
                re.search(test["expected_pattern"], result["response"], re.IGNORECASE)
            )

            print(f"      ✅ Logical reasoning detected: {has_logic_reasoning}")
            print(f"      🎯 Expected pattern found: {has_expected_pattern}")

            logic_results.append(
                {
                    "test": test["name"],
                    "success": True,
                    "has_reasoning": has_logic_reasoning,
                    "has_pattern": has_expected_pattern,
                }
            )
        else:
            print(f"      ❌ Test failed: {result.get('error', 'Unknown error')}")
            logic_results.append(
                {
                    "test": test["name"],
                    "success": False,
                    "has_reasoning": False,
                    "has_pattern": False,
                }
            )

        time.sleep(2)  # Brief pause between tests

    # Test 5: Enhanced reasoning coordination
    print("\n" + "=" * 60)
    print("🔄 REASONING COORDINATION TESTS")
    print("=" * 60)

    coordination_test = test_agent_interaction(
        "Please use your enhanced reasoning to solve this problem: What is 7 * 8, and explain your reasoning process?",
        "Enhanced reasoning coordination",
    )

    if coordination_test["success"]:
        has_reasoning = analyze_mathematical_reasoning(coordination_test["response"])
        has_explanation = any(
            word in coordination_test["response"].lower()
            for word in ["reasoning", "process", "step", "because", "explanation"]
        )
        has_correct_answer = "56" in coordination_test["response"]

        print(f"      ✅ Mathematical reasoning: {has_reasoning}")
        print(f"      📝 Reasoning explanation: {has_explanation}")
        print(f"      🎯 Correct answer (56): {has_correct_answer}")

    # Summary
    print("\n" + "=" * 60)
    print("📊 ENHANCED REASONING TEST SUMMARY")
    print("=" * 60)

    successful_math_tests = sum(
        1 for r in math_results if r["success"] and r["has_reasoning"]
    )
    successful_logic_tests = sum(
        1 for r in logic_results if r["success"] and r["has_reasoning"]
    )

    # Check if answers are correct (more important than reasoning indicators)
    correct_math_answers = sum(
        1 for r in math_results if r["success"] and r["has_answer"]
    )
    correct_logic_patterns = sum(
        1 for r in logic_results if r["success"] and r["has_pattern"]
    )

    print(
        f"🔢 Mathematical Reasoning: {successful_math_tests}/{len(math_tests)} tests passed"
    )
    print(
        f"🧠 Logical Reasoning: {successful_logic_tests}/{len(logic_tests)} tests passed"
    )
    print(f"🎯 Correct Math Answers: {correct_math_answers}/{len(math_tests)}")
    print(f"🎯 Correct Logic Patterns: {correct_logic_patterns}/{len(logic_tests)}")

    overall_success = correct_math_answers >= 2 and correct_logic_patterns >= 2

    if overall_success:
        print("\n🎉 ENHANCED REASONING DEPLOYMENT TEST: ✅ SUCCESS")
        print(
            "🧠 Mathematical and logical reasoning capabilities confirmed working in live deployment!"
        )
        return True
    else:
        print("\n❌ ENHANCED REASONING DEPLOYMENT TEST: FAILED")
        print(
            "Some reasoning capabilities may not be working correctly in live deployment."
        )
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

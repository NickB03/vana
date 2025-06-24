#!/usr/bin/env python3
"""
Test Strengthened Assertions

This script validates that the strengthened test assertions work correctly
and actually catch issues that the previous weak assertions would miss.
"""

import asyncio
import json
import sys
import traceback
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

def test_strengthened_coordination_assertions():
    """Test that the strengthened coordination tool assertions work"""
    print("🧪 Testing strengthened coordination tool assertions...")
    
    try:
        # Import the updated test
        from tests.unit.tools.test_agent_coordination_tools import TestAgentCoordinationTools
        
        test_instance = TestAgentCoordinationTools()
        
        # Run the strengthened test
        test_instance.test_adk_coordinate_task_basic()
        
        print("✅ Strengthened coordination test passed")
        return True
        
    except Exception as e:
        print(f"❌ Strengthened coordination test failed: {e}")
        traceback.print_exc()
        return False

def test_response_quality_improvements():
    """Test that the response quality analyzer improvements work"""
    print("🧪 Testing response quality analyzer improvements...")
    
    try:
        from tests.framework.response_quality_analyzer import ResponseQualityAnalyzer
        
        analyzer = ResponseQualityAnalyzer()
        
        # Test with weak response (should now get low score)
        weak_response = "OK"
        weak_metrics = analyzer.analyze_response(weak_response, "What is the weather in Chicago?")
        
        print(f"   Weak response score: {weak_metrics.overall_score:.2f}")
        assert weak_metrics.overall_score < 0.5, "Weak response should get low score"
        
        # Test with good response (should get higher score)
        good_response = "The current weather in Chicago is 75°F with partly cloudy conditions. The temperature will remain stable throughout the day with light winds from the northwest at 8 mph."
        good_metrics = analyzer.analyze_response(good_response, "What is the weather in Chicago?")
        
        print(f"   Good response score: {good_metrics.overall_score:.2f}")
        assert good_metrics.overall_score > weak_metrics.overall_score, "Good response should score higher than weak response"
        
        print("✅ Response quality improvements validated")
        return True
        
    except Exception as e:
        print(f"❌ Response quality test failed: {e}")
        traceback.print_exc()
        return False

def test_false_positive_detection():
    """Test that strengthened assertions catch false positives"""
    print("🧪 Testing false positive detection...")
    
    try:
        from tests.framework.response_quality_analyzer import ResponseQualityAnalyzer
        
        analyzer = ResponseQualityAnalyzer()
        
        # Test cases that should fail with strengthened validation
        false_positive_cases = [
            ("", "What is 2+2?"),  # Empty response
            ("Error", "What is the weather?"),  # Error response
            ("I don't know", "What is the capital of France?"),  # Non-answer
            ("Yes", "Explain quantum physics"),  # Insufficient response
        ]
        
        for response, query in false_positive_cases:
            metrics = analyzer.analyze_response(response, query)
            print(f"   '{response[:20]}...' score: {metrics.overall_score:.2f}")
            assert metrics.overall_score < 0.6, f"False positive response should score low: {response}"
        
        print("✅ False positive detection working")
        return True
        
    except Exception as e:
        print(f"❌ False positive detection test failed: {e}")
        traceback.print_exc()
        return False

async def test_real_agent_with_strengthened_validation():
    """Test real agent with strengthened validation"""
    print("🧪 Testing real agent with strengthened validation...")
    
    try:
        from tests.working_test_example import WorkingVANATestClient
        
        client = WorkingVANATestClient()
        
        # Test with mathematical query
        response = await client.query_agent("What is 15 * 23?")
        
        # Apply strengthened validation
        assert response["success"], "Agent query must succeed"
        assert len(response["content"]) > 10, "Response must be substantial"
        
        # STRICT: Must contain the correct answer
        content_lower = response["content"].lower()
        expected_answers = ["345", "three hundred forty-five", "three hundred and forty-five"]
        assert any(answer in content_lower for answer in expected_answers), \
            f"Mathematical response must contain correct answer. Got: {response['content']}"
        
        print("✅ Real agent passes strengthened validation")
        return True
        
    except Exception as e:
        print(f"❌ Real agent strengthened validation failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all strengthened assertion tests"""
    print("🔧 Testing Strengthened Test Assertions")
    print("=" * 50)
    
    results = []
    
    # Test 1: Coordination tool assertions
    results.append(test_strengthened_coordination_assertions())
    print()
    
    # Test 2: Response quality improvements
    results.append(test_response_quality_improvements())
    print()
    
    # Test 3: False positive detection
    results.append(test_false_positive_detection())
    print()
    
    # Test 4: Real agent validation
    results.append(asyncio.run(test_real_agent_with_strengthened_validation()))
    print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"🎉 All {total} strengthened assertion tests passed!")
        print("✅ Test suite now provides accurate validation")
        print("✅ False positives eliminated")
        print("✅ Weak assertions strengthened")
    else:
        print(f"⚠️ {passed}/{total} tests passed - some improvements still needed")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
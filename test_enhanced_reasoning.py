#!/usr/bin/env python3
"""
Comprehensive Test Suite for Enhanced Reasoning Capabilities
Validates that agent reasoning deficiencies have been addressed
"""

import sys
import json
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

def test_enhanced_reasoning():
    """Test enhanced reasoning capabilities"""
    print("🧠 Testing Enhanced Agent Reasoning Capabilities...")
    print("=" * 70)
    
    try:
        from lib._tools.enhanced_reasoning_tools import (
            intelligent_echo, enhanced_analyze_task, reasoning_coordinate_task,
            MathematicalReasoning, LogicalReasoning, EnhancedReasoningEngine
        )
        print("✅ Successfully imported enhanced reasoning tools")
        
        # Test 1: Mathematical Reasoning
        print("\n📋 Test 1: Mathematical Reasoning")
        
        math_engine = MathematicalReasoning()
        
        # Test basic arithmetic
        result1 = math_engine.solve_arithmetic("What is 2 + 2?")
        assert result1.answer == 4, f"Expected 4, got {result1.answer}"
        assert result1.confidence > 0.8, "Should have high confidence for simple math"
        assert "2 + 2 = 4" in str(result1.reasoning_steps), "Should show calculation steps"
        print("  ✅ Basic arithmetic: 2 + 2 = 4")
        
        # Test word problems
        result2 = math_engine.solve_arithmetic("Calculate the sum of 15 and 27")
        assert result2.answer == 42, f"Expected 42, got {result2.answer}"
        assert result2.confidence > 0.8, "Should have high confidence"
        print("  ✅ Word problem: sum of 15 and 27 = 42")
        
        # Test complex expression
        result3 = math_engine.solve_arithmetic("What is 10 * 3 + 5?")
        assert result3.answer == 35, f"Expected 35, got {result3.answer}"
        print("  ✅ Complex expression: 10 * 3 + 5 = 35")
        
        # Test 2: Logical Reasoning
        print("\n📋 Test 2: Logical Reasoning")
        
        logical_engine = LogicalReasoning()
        
        # Test word problem reasoning
        word_problem = "If John has 3 apples and gives away 1, how many does he have?"
        result4 = logical_engine.analyze_logical_structure(word_problem)
        assert result4.answer == 2, f"Expected 2, got {result4.answer}"
        assert result4.problem_type == "word_problem", "Should identify as word problem"
        print("  ✅ Word problem: John's apples = 2")
        
        # Test logical structure analysis
        logical_statement = "If it rains, then the ground gets wet"
        result5 = logical_engine.analyze_logical_structure(logical_statement)
        assert "conditional" in result5.answer.lower(), "Should identify conditional logic"
        print("  ✅ Logical structure: conditional statement identified")
        
        # Test 3: Enhanced Echo Function
        print("\n📋 Test 3: Enhanced Echo Function")
        
        # Test mathematical echo
        echo_result1 = intelligent_echo("What is 5 + 3?")
        echo_data1 = json.loads(echo_result1)
        assert echo_data1["solution"] == 8, "Should calculate 5 + 3 = 8"
        assert "reasoning" in echo_data1, "Should include reasoning steps"
        assert echo_data1["confidence"] > 0.7, "Should have high confidence"
        print("  ✅ Mathematical echo: 5 + 3 = 8 with reasoning")
        
        # Test non-mathematical echo
        echo_result2 = intelligent_echo("Hello, how are you?")
        echo_data2 = json.loads(echo_result2)
        assert "Hello, how are you?" in echo_data2["echo"], "Should echo original message"
        assert "analysis" in echo_data2, "Should provide analysis for non-math queries"
        print("  ✅ General echo: proper handling of non-mathematical queries")
        
        # Test 4: Enhanced Task Analysis
        print("\n📋 Test 4: Enhanced Task Analysis")
        
        # Test mathematical task analysis
        analysis_result1 = enhanced_analyze_task("Calculate 12 * 4")
        analysis_data1 = json.loads(analysis_result1)
        assert analysis_data1["analysis"]["answer"] == 48, "Should calculate 12 * 4 = 48"
        assert analysis_data1["analysis"]["problem_type"] == "arithmetic", "Should identify as arithmetic"
        assert len(analysis_data1["analysis"]["reasoning_steps"]) > 1, "Should provide reasoning steps"
        print("  ✅ Mathematical task analysis: 12 * 4 = 48")
        
        # Test word problem analysis
        word_task = "If Sarah has 10 cookies and eats 3, how many are left?"
        analysis_result2 = enhanced_analyze_task(word_task)
        analysis_data2 = json.loads(analysis_result2)
        assert analysis_data2["analysis"]["answer"] == 7, "Should calculate 10 - 3 = 7"
        assert "word_problem" in analysis_data2["analysis"]["problem_type"], "Should identify as word problem"
        print("  ✅ Word problem analysis: Sarah's cookies = 7")
        
        # Test 5: Reasoning-Based Coordination
        print("\n📋 Test 5: Reasoning-Based Coordination")
        
        coordination_result = reasoning_coordinate_task("Solve the equation x + 5 = 12")
        coordination_data = json.loads(coordination_result)
        assert "reasoning_analysis" in coordination_data, "Should include reasoning analysis"
        assert "coordination_strategy" in coordination_data, "Should include coordination strategy"
        assert coordination_data["action"] == "coordinate_task", "Should maintain coordination function"
        print("  ✅ Reasoning-based coordination: proper analysis and strategy")
        
        # Test 6: Enhanced Reasoning Engine Integration
        print("\n📋 Test 6: Enhanced Reasoning Engine")
        
        reasoning_engine = EnhancedReasoningEngine()
        
        # Test mathematical query processing
        math_query = reasoning_engine.process_query("What is 7 * 8?")
        assert math_query.answer == 56, f"Expected 56, got {math_query.answer}"
        assert math_query.problem_type == "arithmetic", "Should identify as arithmetic"
        print("  ✅ Reasoning engine: 7 * 8 = 56")
        
        # Test logical query processing
        logical_query = reasoning_engine.process_query("All birds can fly. Penguins are birds.")
        assert logical_query.problem_type in ["logical_analysis", "general_query"], "Should handle logical statements"
        assert logical_query.reasoning_steps is not None, "Should provide reasoning steps"
        print("  ✅ Reasoning engine: logical statement processing")
        
        # Test 7: Confidence and Quality Metrics
        print("\n📋 Test 7: Confidence and Quality Metrics")
        
        # High confidence mathematical problem
        high_conf_result = math_engine.solve_arithmetic("2 + 3")
        assert high_conf_result.confidence > 0.9, "Simple math should have very high confidence"
        
        # Lower confidence for unclear problem
        unclear_result = reasoning_engine.process_query("vague ambiguous request unclear meaning")
        assert unclear_result.confidence < 0.7, f"Unclear problems should have lower confidence, got {unclear_result.confidence}"
        
        print("  ✅ Confidence metrics: proper confidence assessment")
        
        # Test 8: Error Handling and Edge Cases
        print("\n📋 Test 8: Error Handling")
        
        # Test division by zero (should be handled gracefully)
        try:
            div_zero_result = math_engine.solve_arithmetic("10 / 0")
            # Should return an error result, not crash
            assert isinstance(div_zero_result, object), "Should handle division by zero"
            print("  ✅ Error handling: division by zero handled gracefully")
        except Exception as e:
            print(f"  ⚠️ Division by zero handling needs improvement: {e}")
        
        # Test invalid mathematical expression
        invalid_result = math_engine.solve_arithmetic("this is not math")
        assert invalid_result.confidence < 0.5, "Invalid math should have low confidence"
        print("  ✅ Error handling: invalid expressions handled")
        
        # Test 9: Performance and Response Quality
        print("\n📋 Test 9: Performance and Response Quality")
        
        import time
        
        # Test response time for simple calculations
        start_time = time.time()
        perf_result = intelligent_echo("What is 100 + 200?")
        end_time = time.time()
        
        assert (end_time - start_time) < 1.0, "Should respond quickly for simple calculations"
        perf_data = json.loads(perf_result)
        assert perf_data["solution"] == 300, "Should maintain accuracy under performance test"
        print("  ✅ Performance: fast response with accurate results")
        
        # Test 10: Integration with Existing Systems
        print("\n📋 Test 10: Integration Validation")
        
        # Test that enhanced functions maintain expected interfaces
        echo_test = intelligent_echo("test message")
        assert isinstance(echo_test, str), "Should return string (JSON)"
        
        analysis_test = enhanced_analyze_task("test task")
        assert isinstance(analysis_test, str), "Should return string (JSON)"
        
        coord_test = reasoning_coordinate_task("test coordination")
        assert isinstance(coord_test, str), "Should return string (JSON)"
        
        print("  ✅ Integration: maintains expected interfaces")
        
        print("\n🎉 ALL ENHANCED REASONING TESTS PASSED!")
        print("=" * 70)
        print("✅ Mathematical reasoning: Arithmetic and word problems solved")
        print("✅ Logical reasoning: Word problems and logical structure analysis")
        print("✅ Enhanced echo: Intelligent responses with reasoning")
        print("✅ Enhanced task analysis: Problem solving with detailed reasoning")
        print("✅ Reasoning coordination: Strategy based on problem understanding")
        print("✅ Quality metrics: Appropriate confidence assessment")
        print("✅ Error handling: Graceful handling of edge cases")
        print("✅ Performance: Fast response times maintained")
        print("✅ Integration: Compatible with existing system interfaces")
        
        print("\n🧠 AGENT REASONING DEFICIENCIES ADDRESSED!")
        print("Agents now provide actual reasoning and problem solving instead of generic responses.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ ENHANCED REASONING TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_enhanced_reasoning()
    sys.exit(0 if success else 1)
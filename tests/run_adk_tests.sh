#!/bin/bash

# VANA ADK Evaluation Test Runner
# This script runs ADK evaluation tests for the VANA multi-agent system

echo "🚀 VANA ADK Evaluation Test Suite"
echo "=================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "agents/vana/__init__.py" ]; then
    echo "❌ Error: Must run from VANA project root directory"
    exit 1
fi

# Function to run a test and check results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo "Running: $test_name"
    echo "File: $test_file"
    
    if adk eval agents/vana "$test_file" --config_file_path=tests/test_config.json; then
        echo "✅ PASSED"
    else
        echo "❌ FAILED"
        ((FAILED_TESTS++))
    fi
    echo ""
}

# Initialize counters
FAILED_TESTS=0
TOTAL_TESTS=0

echo "📋 Unit Tests - Orchestrator"
echo "----------------------------"

# Orchestrator tests
run_test "tests/unit/orchestrator/basic_routing.test.json" "Basic Routing"
((TOTAL_TESTS++))

run_test "tests/unit/orchestrator/delegation_patterns.test.json" "Delegation Patterns"
((TOTAL_TESTS++))

run_test "tests/unit/orchestrator/error_handling.test.json" "Error Handling"
((TOTAL_TESTS++))

echo ""
echo "📋 Unit Tests - Specialists"
echo "--------------------------"

# Specialist tests
run_test "tests/unit/specialists/simple_search.test.json" "Simple Search Agent"
((TOTAL_TESTS++))

run_test "tests/unit/specialists/research_specialist.test.json" "Research Specialist"
((TOTAL_TESTS++))

echo ""
echo "📋 Integration Tests"
echo "-------------------"

# Integration tests
run_test "tests/integration/multi_agent_workflows.evalset.json" "Multi-Agent Workflows"
((TOTAL_TESTS++))

echo ""
echo "📊 Test Summary"
echo "==============="
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $((TOTAL_TESTS - FAILED_TESTS))"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    exit 1
fi
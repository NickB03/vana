#!/bin/bash

# VANA Comprehensive Test Runner
# Runs all available tests with proper organization

set -e  # Exit on error

echo "===== VANA Comprehensive Test Suite ====="
echo "Running on: $(date)"
echo ""

# Create logs directory
mkdir -p logs/test_results

# Function to run tests and capture results
run_test_suite() {
    local name=$1
    local command=$2
    local log_file="logs/test_results/${name}_$(date +%Y%m%d_%H%M%S).log"
    
    echo "Running $name..."
    if $command > "$log_file" 2>&1; then
        echo "✅ $name: PASSED"
        return 0
    else
        echo "❌ $name: FAILED (see $log_file)"
        return 1
    fi
}

# Track overall success
OVERALL_SUCCESS=true

# 1. Unit Tests
echo ""
echo "=== Unit Tests ==="
run_test_suite "ADK Tools Async Tests" "python -m pytest tests/unit/tools/test_adk_tools_async_fixed.py -v" || OVERALL_SUCCESS=false
run_test_suite "General Unit Tests" "python -m pytest tests/unit -v -k 'not test_adk_tools_critical'" || OVERALL_SUCCESS=false

# 2. Integration Tests
echo ""
echo "=== Integration Tests ==="
run_test_suite "Agent Integration" "python -m pytest tests/integration -v" || OVERALL_SUCCESS=false

# 3. One-Time Tests (Direct Agent Tests)
echo ""
echo "=== Agent Direct Tests ==="
run_test_suite "Agent Direct Test" "python -m pytest tests/one_time_tests/test_agent_direct.py -v" || OVERALL_SUCCESS=false

# 4. Validation Scripts
echo ""
echo "=== Validation Scripts ==="
run_test_suite "Workflow Engine Validation" "python validate_workflow_engine.py" || OVERALL_SUCCESS=false
run_test_suite "Task Analyzer Validation" "python validate_task_analyzer.py" || OVERALL_SUCCESS=false
run_test_suite "Task Classifier Validation" "python validate_task_classifier.py" || OVERALL_SUCCESS=false

# 5. API Tests (if backend is running)
echo ""
echo "=== API Tests ==="
if curl -s http://localhost:8081/health > /dev/null 2>&1; then
    echo "Backend is running, testing API..."
    if curl -X POST http://localhost:8081/run \
        -H "Content-Type: application/json" \
        -d '{"input": "Hello VANA, can you tell me what time it is?"}' \
        -s | grep -q "UTC time"; then
        echo "✅ API Test: PASSED"
    else
        echo "❌ API Test: FAILED"
        OVERALL_SUCCESS=false
    fi
else
    echo "⚠️  Backend not running, skipping API tests"
fi

# 6. Generate Coverage Report (optional)
echo ""
echo "=== Coverage Report ==="
if command -v coverage &> /dev/null; then
    echo "Generating coverage report..."
    python -m pytest tests/unit tests/integration --cov=lib --cov=agents --cov-report=html --cov-report=term-missing > logs/test_results/coverage_report.txt 2>&1 || true
    echo "Coverage report saved to htmlcov/ and logs/test_results/coverage_report.txt"
else
    echo "Coverage tool not installed, skipping coverage report"
fi

# Final Summary
echo ""
echo "===== Test Summary ====="
echo "Test logs saved in: logs/test_results/"
echo ""

if [ "$OVERALL_SUCCESS" = true ]; then
    echo "✅ ALL TESTS PASSED!"
    exit 0
else
    echo "❌ SOME TESTS FAILED - Check logs for details"
    echo ""
    echo "Recent failures:"
    grep -l "FAILED" logs/test_results/*.log 2>/dev/null | tail -5 || echo "No failure logs found"
    exit 1
fi
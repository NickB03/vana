#!/bin/bash

# Simple Hook Validation Script - Compatible with macOS bash 3.2+
# Validates git hooks for CI/CD compliance

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

echo "🔗 Git Hooks CI/CD Validation"
echo "============================="
echo "Project Root: $PROJECT_ROOT"
echo "Timestamp: $(date)"
echo ""

# Create report directory
REPORT_DIR=".claude_workspace/reports/cicd-hook-validation"
mkdir -p "$REPORT_DIR"

# Track results
TESTS_PASSED=0
TESTS_FAILED=0
OVERALL_STATUS="PASS"

echo "📋 Phase 1: Functional Tests"
echo "---------------------------"

echo "Running git hook integration tests..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration -v > "$REPORT_DIR/functional-tests.log" 2>&1; then
    echo "✅ Functional tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Functional tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "📊 Phase 2: Performance Benchmark" 
echo "--------------------------------"

echo "Running performance benchmark..."
if python tests/performance/hook_performance_benchmarker.py --iterations 10 > "$REPORT_DIR/performance-benchmark.log" 2>&1; then
    echo "✅ Performance benchmark completed"
    ((TESTS_PASSED++))
else
    echo "❌ Performance benchmark failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "🚀 Phase 3: Stress Tests"
echo "----------------------"

echo "Running stress tests..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestHookPerformanceStress -v > "$REPORT_DIR/stress-tests.log" 2>&1; then
    echo "✅ Stress tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Stress tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "🔒 Phase 4: Security Validation"
echo "------------------------------"

echo "Testing hook validation integration..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration::test_hook_validation_integration -v > "$REPORT_DIR/security-tests.log" 2>&1; then
    echo "✅ Security validation passed"
    ((TESTS_PASSED++))
else
    echo "❌ Security validation failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "📈 Phase 5: Memory & Concurrency"
echo "-------------------------------"

echo "Testing memory usage..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration::test_memory_usage_during_hook_execution -v > "$REPORT_DIR/memory-tests.log" 2>&1; then
    echo "✅ Memory tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Memory tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo "Testing concurrent execution..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration::test_concurrent_hook_execution -v > "$REPORT_DIR/concurrency-tests.log" 2>&1; then
    echo "✅ Concurrency tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Concurrency tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "📄 Phase 6: Performance Threshold Validation"
echo "-------------------------------------------"

# Check if performance benchmark results exist
BENCHMARK_JSON=".claude_workspace/reports/hook-performance-benchmark.json"

if [[ -f "$BENCHMARK_JSON" ]]; then
    echo "Validating performance thresholds..."
    
    # Simple threshold checks using python
    cat > "$REPORT_DIR/check_thresholds.py" << 'EOF'
import json
import sys

thresholds = {
    "pre-commit": {"max_time": 2000, "min_success": 0.95},
    "post-commit": {"max_time": 1000, "min_success": 0.98},
    "pre-push": {"max_time": 3000, "min_success": 0.90},
    "post-merge": {"max_time": 1500, "min_success": 0.95},
    "pre-rebase": {"max_time": 2000, "min_success": 0.90}
}

try:
    with open(sys.argv[1], 'r') as f:
        data = json.load(f)
    
    hooks = data.get("hook_benchmarks", {})
    passed = 0
    failed = 0
    
    for hook_name, threshold in thresholds.items():
        if hook_name in hooks:
            hook_data = hooks[hook_name]
            avg_time = hook_data.get("avg_execution_time_ms", 0)
            success_rate = hook_data.get("success_rate", 0)
            
            time_ok = avg_time <= threshold["max_time"]
            success_ok = success_rate >= threshold["min_success"]
            
            if time_ok and success_ok:
                print(f"✅ {hook_name}: {avg_time:.1f}ms (≤{threshold['max_time']}ms), {success_rate:.1%} (≥{threshold['min_success']:.1%})")
                passed += 1
            else:
                print(f"❌ {hook_name}: {avg_time:.1f}ms (≤{threshold['max_time']}ms), {success_rate:.1%} (≥{threshold['min_success']:.1%})")
                failed += 1
        else:
            print(f"⚠️  {hook_name}: No benchmark data found")
            failed += 1
    
    print(f"\nThreshold validation: {passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)
    
except Exception as e:
    print(f"Error validating thresholds: {e}")
    sys.exit(1)
EOF

    if python "$REPORT_DIR/check_thresholds.py" "$BENCHMARK_JSON"; then
        echo "✅ All hooks meet performance thresholds"
        ((TESTS_PASSED++))
    else
        echo "❌ Some hooks exceed performance thresholds"
        ((TESTS_FAILED++))
        OVERALL_STATUS="FAIL"
    fi
    
    rm "$REPORT_DIR/check_thresholds.py"
else
    echo "⚠️  No benchmark data found - skipping threshold validation"
fi

echo ""
echo "📋 Generating Final Report"
echo "------------------------"

# Generate compliance report
COMPLIANCE_REPORT="$REPORT_DIR/cicd-compliance-report.txt"

cat > "$COMPLIANCE_REPORT" << EOF
Git Hooks CI/CD Compliance Report
=================================

Test Execution Date: $(date)
Project Root: $PROJECT_ROOT

Test Summary:
- Tests Passed: $TESTS_PASSED  
- Tests Failed: $TESTS_FAILED
- Overall Status: $OVERALL_STATUS

Performance Standards (CI/CD):
- pre-commit: ≤2000ms, ≥95% success
- post-commit: ≤1000ms, ≥98% success  
- pre-push: ≤3000ms, ≥90% success
- post-merge: ≤1500ms, ≥95% success
- pre-rebase: ≤2000ms, ≥90% success

Test Reports:
- Functional Tests: $REPORT_DIR/functional-tests.log
- Performance Benchmark: $REPORT_DIR/performance-benchmark.log
- Stress Tests: $REPORT_DIR/stress-tests.log
- Security Tests: $REPORT_DIR/security-tests.log
- Memory Tests: $REPORT_DIR/memory-tests.log
- Concurrency Tests: $REPORT_DIR/concurrency-tests.log

Performance Data: $BENCHMARK_JSON
EOF

echo ""
echo "🏁 Final Results"
echo "==============="
echo "Overall Status: $OVERALL_STATUS"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Compliance Report: $COMPLIANCE_REPORT"

# Show performance summary if available  
if [[ -f ".claude_workspace/reports/hook-performance-summary.txt" ]]; then
    echo ""
    echo "📊 Performance Summary:"
    echo "======================"
    cat ".claude_workspace/reports/hook-performance-summary.txt"
fi

echo ""
if [[ "$OVERALL_STATUS" == "PASS" ]]; then
    echo "✅ SUCCESS: All git hooks meet CI/CD standards and are ready for production!"
    exit 0
else
    echo "❌ FAILURE: Some git hooks do not meet CI/CD standards. Review reports above."
    exit 1
fi
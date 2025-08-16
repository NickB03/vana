#!/bin/bash

# Comprehensive Hook Testing Suite for CI/CD Pipeline
# This script validates all git hooks meet CI/CD standards for performance and reliability

set -e

# Check for bash 4+ for associative arrays
if [ "${BASH_VERSION%%.*}" -lt 4 ]; then
    echo "Error: This script requires bash 4.0 or later for associative arrays"
    echo "Current bash version: $BASH_VERSION"
    exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

echo "🔗 Comprehensive Hook Testing Suite for CI/CD"
echo "=============================================="
echo "Project Root: $PROJECT_ROOT"
echo "Timestamp: $(date)"
echo ""

# Configuration
REPORT_DIR=".claude_workspace/reports/cicd-hook-validation"
mkdir -p "$REPORT_DIR"

# Performance Standards for CI/CD
declare -A PERFORMANCE_THRESHOLDS=(
    ["pre-commit"]="2000"     # 2 seconds max
    ["post-commit"]="1000"    # 1 second max
    ["pre-push"]="3000"       # 3 seconds max
    ["post-merge"]="1500"     # 1.5 seconds max
    ["pre-rebase"]="2000"     # 2 seconds max
)

declare -A SUCCESS_THRESHOLDS=(
    ["pre-commit"]="0.95"     # 95% success rate
    ["post-commit"]="0.98"    # 98% success rate
    ["pre-push"]="0.90"       # 90% success rate
    ["post-merge"]="0.95"     # 95% success rate
    ["pre-rebase"]="0.90"     # 90% success rate
)

# Track overall results
TESTS_PASSED=0
TESTS_FAILED=0
OVERALL_STATUS="PASS"

echo "📋 Phase 1: Functional Validation"
echo "--------------------------------"

# Run functional tests
echo "Running Python integration tests..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration -v > "$REPORT_DIR/functional-tests.log" 2>&1; then
    echo "✅ Functional tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Functional tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "📊 Phase 2: Performance Benchmarking"
echo "-----------------------------------"

# Run comprehensive performance benchmark
echo "Running comprehensive performance benchmark..."
if python tests/performance/hook_performance_benchmarker.py --iterations 15 > "$REPORT_DIR/performance-benchmark.log" 2>&1; then
    echo "✅ Performance benchmark completed"
    ((TESTS_PASSED++))
else
    echo "❌ Performance benchmark failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

# Check benchmark results against thresholds
echo "Validating performance against CI/CD thresholds..."
BENCHMARK_JSON="$REPORT_DIR/../hook-performance-benchmark.json"

if [[ -f "$BENCHMARK_JSON" ]]; then
    # Extract performance metrics and validate
    for hook in "${!PERFORMANCE_THRESHOLDS[@]}"; do
        if command -v jq >/dev/null 2>&1; then
            avg_time=$(jq -r ".hook_benchmarks.$hook.avg_execution_time_ms // 0" "$BENCHMARK_JSON")
            success_rate=$(jq -r ".hook_benchmarks.$hook.success_rate // 0" "$BENCHMARK_JSON")
            
            # Check time threshold
            time_threshold=${PERFORMANCE_THRESHOLDS[$hook]}
            if (( $(echo "$avg_time > $time_threshold" | bc -l) )); then
                echo "❌ $hook hook exceeds time threshold: ${avg_time}ms > ${time_threshold}ms"
                OVERALL_STATUS="FAIL"
                ((TESTS_FAILED++))
            else
                echo "✅ $hook hook meets time threshold: ${avg_time}ms <= ${time_threshold}ms"
                ((TESTS_PASSED++))
            fi
            
            # Check success rate threshold
            success_threshold=${SUCCESS_THRESHOLDS[$hook]}
            if (( $(echo "$success_rate < $success_threshold" | bc -l) )); then
                echo "❌ $hook hook below success threshold: ${success_rate} < ${success_threshold}"
                OVERALL_STATUS="FAIL"
                ((TESTS_FAILED++))
            else
                echo "✅ $hook hook meets success threshold: ${success_rate} >= ${success_threshold}"
                ((TESTS_PASSED++))
            fi
        else
            echo "⚠️  jq not available - skipping detailed threshold validation"
        fi
    done
else
    echo "⚠️  Benchmark results not found - skipping threshold validation"
fi

echo ""
echo "🚀 Phase 3: Stress Testing"
echo "-------------------------"

# Run stress tests
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
echo "🔒 Phase 4: Security and Validation"
echo "----------------------------------"

# Test security validation integration
echo "Testing security validation integration..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration::test_hook_validation_integration -v > "$REPORT_DIR/security-tests.log" 2>&1; then
    echo "✅ Security validation tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Security validation tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

echo ""
echo "📈 Phase 5: Memory and Resource Testing"
echo "--------------------------------------"

# Test memory usage
echo "Testing memory usage patterns..."
if python -m pytest tests/integration/test_git_hook_integration_fixed.py::TestGitHookIntegration::test_memory_usage_during_hook_execution -v > "$REPORT_DIR/memory-tests.log" 2>&1; then
    echo "✅ Memory tests passed"
    ((TESTS_PASSED++))
else
    echo "❌ Memory tests failed"
    ((TESTS_FAILED++))
    OVERALL_STATUS="FAIL"
fi

# Test concurrent execution
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
echo "📄 Phase 6: Report Generation"
echo "-----------------------------"

# Generate final CI/CD compliance report
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

Performance Thresholds:
EOF

for hook in "${!PERFORMANCE_THRESHOLDS[@]}"; do
    echo "- $hook: Max ${PERFORMANCE_THRESHOLDS[$hook]}ms, Min ${SUCCESS_THRESHOLDS[$hook]} success rate" >> "$COMPLIANCE_REPORT"
done

echo "" >> "$COMPLIANCE_REPORT"
echo "Detailed Results:" >> "$COMPLIANCE_REPORT"
echo "- Functional Tests: $REPORT_DIR/functional-tests.log" >> "$COMPLIANCE_REPORT"
echo "- Performance Benchmark: $REPORT_DIR/performance-benchmark.log" >> "$COMPLIANCE_REPORT"
echo "- Stress Tests: $REPORT_DIR/stress-tests.log" >> "$COMPLIANCE_REPORT"
echo "- Security Tests: $REPORT_DIR/security-tests.log" >> "$COMPLIANCE_REPORT"
echo "- Memory Tests: $REPORT_DIR/memory-tests.log" >> "$COMPLIANCE_REPORT"
echo "- Concurrency Tests: $REPORT_DIR/concurrency-tests.log" >> "$COMPLIANCE_REPORT"

if [[ -f "$BENCHMARK_JSON" ]]; then
    echo "- Performance Data: $BENCHMARK_JSON" >> "$COMPLIANCE_REPORT"
fi

echo ""
echo "🏁 Final Results"
echo "================"
echo "Overall Status: $OVERALL_STATUS"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo "Compliance Report: $COMPLIANCE_REPORT"

if [[ -f ".claude_workspace/reports/hook-performance-summary.txt" ]]; then
    echo ""
    echo "📊 Performance Summary:"
    cat ".claude_workspace/reports/hook-performance-summary.txt"
fi

echo ""
if [[ "$OVERALL_STATUS" == "PASS" ]]; then
    echo "✅ All git hooks meet CI/CD standards and are ready for production deployment!"
    exit 0
else
    echo "❌ Some git hooks do not meet CI/CD standards. Review the reports above."
    exit 1
fi
#!/bin/bash

# Git Hook Testing Framework - Master Test Runner
# ==============================================
# 
# Comprehensive test execution script for Git hook integration testing.
# Supports multiple test modes, CI/CD integration, and automated reporting.
#
# Usage:
#   ./run_git_hook_tests.sh [mode] [options]
#
# Modes:
#   unit        - Run unit tests only
#   integration - Run integration tests only  
#   performance - Run performance benchmarks only
#   e2e         - Run end-to-end tests only
#   full        - Run all test suites (default)
#   ci          - Run CI/CD optimized test suite
#   quick       - Run quick validation tests
#
# Options:
#   --parallel     - Run tests in parallel
#   --fail-fast    - Stop on first failure
#   --verbose      - Enable verbose output
#   --timeout=N    - Set timeout in seconds (default: 600)
#   --output=DIR   - Output directory for reports
#   --branch=NAME  - Git branch to test
#   --commit=HASH  - Git commit to test
#
# Author: Tester Agent (Git Integration Specialist)

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
WORKSPACE_DIR="${PROJECT_ROOT}"
OUTPUT_DIR="${PROJECT_ROOT}/.claude_workspace/reports/git-hook-tests"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SESSION_ID="git-hooks-${TIMESTAMP}"

# Default settings
TEST_MODE="full"
PARALLEL=false
FAIL_FAST=false
VERBOSE=false
TIMEOUT=600
BRANCH=""
COMMIT=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${PURPLE}[HEADER]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
Git Hook Testing Framework - Master Test Runner

USAGE:
    ./run_git_hook_tests.sh [MODE] [OPTIONS]

MODES:
    unit            Run unit tests only
    integration     Run integration tests only
    performance     Run performance benchmarks only
    e2e            Run end-to-end tests only
    full           Run all test suites (default)
    ci             Run CI/CD optimized test suite
    quick          Run quick validation tests

OPTIONS:
    --parallel      Run tests in parallel
    --fail-fast     Stop on first failure
    --verbose       Enable verbose output
    --timeout=N     Set timeout in seconds (default: 600)
    --output=DIR    Output directory for reports
    --branch=NAME   Git branch to test
    --commit=HASH   Git commit to test
    --help          Show this help message

EXAMPLES:
    # Run full test suite
    ./run_git_hook_tests.sh full

    # Run quick validation
    ./run_git_hook_tests.sh quick --parallel

    # Run CI mode with custom timeout
    ./run_git_hook_tests.sh ci --timeout=300 --fail-fast

    # Run performance tests with verbose output
    ./run_git_hook_tests.sh performance --verbose

    # Run integration tests for specific branch
    ./run_git_hook_tests.sh integration --branch=feature/new-hooks

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            unit|integration|performance|e2e|full|ci|quick)
                TEST_MODE="$1"
                shift
                ;;
            --parallel)
                PARALLEL=true
                shift
                ;;
            --fail-fast)
                FAIL_FAST=true
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            --timeout=*)
                TIMEOUT="${1#*=}"
                shift
                ;;
            --output=*)
                OUTPUT_DIR="${1#*=}"
                shift
                ;;
            --branch=*)
                BRANCH="${1#*=}"
                shift
                ;;
            --commit=*)
                COMMIT="${1#*=}"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Setup test environment
setup_environment() {
    log_header "Setting up Git hook testing environment"
    
    # Create output directories
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$OUTPUT_DIR/unit"
    mkdir -p "$OUTPUT_DIR/integration"
    mkdir -p "$OUTPUT_DIR/performance"
    mkdir -p "$OUTPUT_DIR/e2e"
    mkdir -p "$OUTPUT_DIR/reports"
    mkdir -p "$OUTPUT_DIR/artifacts"
    
    # Check dependencies
    check_dependencies
    
    # Initialize test session
    echo "{
        \"session_id\": \"$SESSION_ID\",
        \"test_mode\": \"$TEST_MODE\",
        \"started_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
        \"workspace\": \"$WORKSPACE_DIR\",
        \"branch\": \"$BRANCH\",
        \"commit\": \"$COMMIT\",
        \"configuration\": {
            \"parallel\": $PARALLEL,
            \"fail_fast\": $FAIL_FAST,
            \"verbose\": $VERBOSE,
            \"timeout\": $TIMEOUT
        }
    }" > "$OUTPUT_DIR/session.json"
    
    log_success "Environment setup complete"
    log_info "Session ID: $SESSION_ID"
    log_info "Output directory: $OUTPUT_DIR"
}

# Check required dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    # Check Python and uv
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    fi
    
    if ! command -v uv &> /dev/null; then
        missing_deps+=("uv")
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    # Check Node.js (for Claude Flow integration)
    if ! command -v node &> /dev/null; then
        log_warning "Node.js not found - Claude Flow integration may be limited"
    fi
    
    if ! command -v npx &> /dev/null; then
        log_warning "npx not found - Claude Flow hooks may not work"
    fi
    
    # Check for pytest
    if ! python3 -c "import pytest" &> /dev/null; then
        missing_deps+=("pytest")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Please install missing dependencies before running tests"
        exit 1
    fi
    
    log_success "All dependencies available"
}

# Claude Flow integration hooks
claude_flow_pre_task() {
    if command -v npx &> /dev/null; then
        log_info "Initializing Claude Flow task coordination..."
        npx claude-flow hooks pre-task \
            --description "Git hook testing session: $TEST_MODE" \
            --task-id "$SESSION_ID" \
            --auto-spawn-agents 2>/dev/null || log_warning "Claude Flow pre-task hook failed"
    fi
}

claude_flow_post_task() {
    if command -v npx &> /dev/null; then
        log_info "Completing Claude Flow task analysis..."
        npx claude-flow hooks post-task \
            --task-id "$SESSION_ID" \
            --analyze-performance \
            --generate-insights 2>/dev/null || log_warning "Claude Flow post-task hook failed"
    fi
}

claude_flow_session_end() {
    if command -v npx &> /dev/null; then
        log_info "Finalizing Claude Flow session..."
        npx claude-flow hooks session-end \
            --export-metrics \
            --generate-summary \
            --session-id "$SESSION_ID" 2>/dev/null || log_warning "Claude Flow session-end hook failed"
    fi
}

# Run unit tests
run_unit_tests() {
    log_header "Running Git hook unit tests"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    # Run Python unit tests
    log_info "Executing unit test suite..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$VERBOSE" = true ]; then
        python3 -m pytest tests/hooks/git/git_hook_test_suite.py::TestGitHookIntegration -v \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/unit/junit-results.xml" \
            --html="$OUTPUT_DIR/unit/test-report.html" --self-contained-html \
            2>&1 | tee "$OUTPUT_DIR/unit/test-output.log"
        exit_code=${PIPESTATUS[0]}
    else
        python3 -m pytest tests/hooks/git/git_hook_test_suite.py::TestGitHookIntegration \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/unit/junit-results.xml" \
            --html="$OUTPUT_DIR/unit/test-report.html" --self-contained-html \
            > "$OUTPUT_DIR/unit/test-output.log" 2>&1
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate unit test summary
    echo "{
        \"test_suite\": \"unit\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"junit_xml\": \"$OUTPUT_DIR/unit/junit-results.xml\",
            \"html_report\": \"$OUTPUT_DIR/unit/test-report.html\",
            \"output_log\": \"$OUTPUT_DIR/unit/test-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/unit/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "Unit tests completed successfully in ${duration}s"
    else
        log_error "Unit tests failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run integration tests
run_integration_tests() {
    log_header "Running Git hook integration tests"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    log_info "Executing integration test suite..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$VERBOSE" = true ]; then
        python3 -m pytest tests/hooks/git/git_integration_test_runner.py::TestGitIntegrationRunner -v \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/integration/junit-results.xml" \
            --html="$OUTPUT_DIR/integration/test-report.html" --self-contained-html \
            2>&1 | tee "$OUTPUT_DIR/integration/test-output.log"
        exit_code=${PIPESTATUS[0]}
    else
        python3 -m pytest tests/hooks/git/git_integration_test_runner.py::TestGitIntegrationRunner \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/integration/junit-results.xml" \
            --html="$OUTPUT_DIR/integration/test-report.html" --self-contained-html \
            > "$OUTPUT_DIR/integration/test-output.log" 2>&1
        exit_code=$?
    fi
    
    # Also run comprehensive integration scenarios
    if [ $exit_code -eq 0 ] && [ "$TEST_MODE" != "quick" ]; then
        log_info "Running comprehensive integration scenarios..."
        python3 tests/hooks/git/git_integration_test_runner.py quick > "$OUTPUT_DIR/integration/scenarios-output.log" 2>&1
        scenarios_exit_code=$?
        
        if [ $scenarios_exit_code -ne 0 ]; then
            log_warning "Some integration scenarios failed"
            exit_code=$scenarios_exit_code
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate integration test summary
    echo "{
        \"test_suite\": \"integration\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"junit_xml\": \"$OUTPUT_DIR/integration/junit-results.xml\",
            \"html_report\": \"$OUTPUT_DIR/integration/test-report.html\",
            \"output_log\": \"$OUTPUT_DIR/integration/test-output.log\",
            \"scenarios_log\": \"$OUTPUT_DIR/integration/scenarios-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/integration/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "Integration tests completed successfully in ${duration}s"
    else
        log_error "Integration tests failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run performance benchmarks
run_performance_tests() {
    log_header "Running Git hook performance benchmarks"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    log_info "Executing performance benchmark suite..."
    
    cd "$PROJECT_ROOT"
    
    # Run performance unit tests
    if [ "$VERBOSE" = true ]; then
        python3 -m pytest tests/hooks/git/git_performance_benchmarks.py::TestGitPerformanceBenchmarks -v \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/performance/junit-results.xml" \
            --html="$OUTPUT_DIR/performance/test-report.html" --self-contained-html \
            2>&1 | tee "$OUTPUT_DIR/performance/test-output.log"
        exit_code=${PIPESTATUS[0]}
    else
        python3 -m pytest tests/hooks/git/git_performance_benchmarks.py::TestGitPerformanceBenchmarks \
            --tb=short --maxfail=$([ "$FAIL_FAST" = true ] && echo "1" || echo "999") \
            --timeout="$TIMEOUT" \
            --junit-xml="$OUTPUT_DIR/performance/junit-results.xml" \
            --html="$OUTPUT_DIR/performance/test-report.html" --self-contained-html \
            > "$OUTPUT_DIR/performance/test-output.log" 2>&1
        exit_code=$?
    fi
    
    # Run standalone performance benchmarks
    if [ $exit_code -eq 0 ] && [ "$TEST_MODE" != "quick" ]; then
        log_info "Running comprehensive performance benchmarks..."
        python3 tests/hooks/git/git_performance_benchmarks.py quick > "$OUTPUT_DIR/performance/benchmarks-output.log" 2>&1
        benchmark_exit_code=$?
        
        if [ $benchmark_exit_code -ne 0 ]; then
            log_warning "Some performance benchmarks failed"
            exit_code=$benchmark_exit_code
        fi
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate performance test summary
    echo "{
        \"test_suite\": \"performance\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"junit_xml\": \"$OUTPUT_DIR/performance/junit-results.xml\",
            \"html_report\": \"$OUTPUT_DIR/performance/test-report.html\",
            \"output_log\": \"$OUTPUT_DIR/performance/test-output.log\",
            \"benchmarks_log\": \"$OUTPUT_DIR/performance/benchmarks-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/performance/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "Performance tests completed successfully in ${duration}s"
    else
        log_error "Performance tests failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run end-to-end tests
run_e2e_tests() {
    log_header "Running Git hook end-to-end tests"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    log_info "Executing end-to-end test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Run E2E automation tests
    if [ "$VERBOSE" = true ]; then
        python3 tests/hooks/git/git_test_automation.py \
            --workspace "$WORKSPACE_DIR" \
            --suites e2e \
            $([ "$FAIL_FAST" = true ] && echo "--fail-fast") \
            $([ "$PARALLEL" = true ] && echo "--parallel") \
            --output "$OUTPUT_DIR/e2e" \
            2>&1 | tee "$OUTPUT_DIR/e2e/test-output.log"
        exit_code=${PIPESTATUS[0]}
    else
        python3 tests/hooks/git/git_test_automation.py \
            --workspace "$WORKSPACE_DIR" \
            --suites e2e \
            $([ "$FAIL_FAST" = true ] && echo "--fail-fast") \
            $([ "$PARALLEL" = true ] && echo "--parallel") \
            --output "$OUTPUT_DIR/e2e" \
            > "$OUTPUT_DIR/e2e/test-output.log" 2>&1
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate E2E test summary
    echo "{
        \"test_suite\": \"e2e\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"output_log\": \"$OUTPUT_DIR/e2e/test-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/e2e/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "E2E tests completed successfully in ${duration}s"
    else
        log_error "E2E tests failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run CI/CD optimized test suite
run_ci_tests() {
    log_header "Running CI/CD optimized Git hook tests"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    log_info "Executing CI/CD test automation..."
    
    cd "$PROJECT_ROOT"
    
    # Run automated CI pipeline
    if [ "$VERBOSE" = true ]; then
        python3 tests/hooks/git/git_test_automation.py \
            --workspace "$WORKSPACE_DIR" \
            --suites unit integration performance \
            $([ "$FAIL_FAST" = true ] && echo "--fail-fast") \
            $([ "$PARALLEL" = true ] && echo "--parallel") \
            $([ -n "$BRANCH" ] && echo "--branch $BRANCH") \
            $([ -n "$COMMIT" ] && echo "--commit $COMMIT") \
            --output "$OUTPUT_DIR" \
            2>&1 | tee "$OUTPUT_DIR/ci-output.log"
        exit_code=${PIPESTATUS[0]}
    else
        python3 tests/hooks/git/git_test_automation.py \
            --workspace "$WORKSPACE_DIR" \
            --suites unit integration performance \
            $([ "$FAIL_FAST" = true ] && echo "--fail-fast") \
            $([ "$PARALLEL" = true ] && echo "--parallel") \
            $([ -n "$BRANCH" ] && echo "--branch $BRANCH") \
            $([ -n "$COMMIT" ] && echo "--commit $COMMIT") \
            --output "$OUTPUT_DIR" \
            > "$OUTPUT_DIR/ci-output.log" 2>&1
        exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate CI test summary
    echo "{
        \"test_suite\": \"ci\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"output_log\": \"$OUTPUT_DIR/ci-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "CI tests completed successfully in ${duration}s"
    else
        log_error "CI tests failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run quick validation tests
run_quick_tests() {
    log_header "Running quick Git hook validation"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    log_info "Executing quick validation tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run subset of unit tests
    python3 -m pytest tests/hooks/git/git_hook_test_suite.py::TestGitHookIntegration::test_pre_commit_prd_compliant_code \
        tests/hooks/git/git_hook_test_suite.py::TestGitHookIntegration::test_pre_commit_blocks_prd_violations \
        tests/hooks/git/git_hook_test_suite.py::TestGitHookIntegration::test_emergency_bypass_mechanism \
        --tb=short --maxfail=1 \
        --junit-xml="$OUTPUT_DIR/quick-results.xml" \
        > "$OUTPUT_DIR/quick-output.log" 2>&1
    exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Generate quick test summary
    echo "{
        \"test_suite\": \"quick\",
        \"success\": $([ $exit_code -eq 0 ] && echo "true" || echo "false"),
        \"exit_code\": $exit_code,
        \"duration_seconds\": $duration,
        \"artifacts\": {
            \"junit_xml\": \"$OUTPUT_DIR/quick-results.xml\",
            \"output_log\": \"$OUTPUT_DIR/quick-output.log\"
        },
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" > "$OUTPUT_DIR/summary.json"
    
    if [ $exit_code -eq 0 ]; then
        log_success "Quick validation completed successfully in ${duration}s"
    else
        log_error "Quick validation failed with exit code $exit_code after ${duration}s"
    fi
    
    return $exit_code
}

# Run tests in parallel
run_parallel_tests() {
    log_header "Running Git hook tests in parallel"
    
    local pids=()
    local results=()
    local overall_exit_code=0
    
    # Start test suites in background
    if [[ "$TEST_MODE" == "full" ]]; then
        log_info "Starting parallel execution of all test suites..."
        
        run_unit_tests &
        pids+=($!)
        
        run_integration_tests &
        pids+=($!)
        
        run_performance_tests &
        pids+=($!)
        
        run_e2e_tests &
        pids+=($!)
        
    else
        log_error "Parallel execution only supported for 'full' mode"
        return 1
    fi
    
    # Wait for all background processes
    for i in "${!pids[@]}"; do
        wait "${pids[$i]}"
        local exit_code=$?
        results[$i]=$exit_code
        
        if [ $exit_code -ne 0 ]; then
            overall_exit_code=$exit_code
            if [ "$FAIL_FAST" = true ]; then
                log_warning "Fail-fast enabled - terminating remaining tests"
                for j in "${pids[@]}"; do
                    kill $j 2>/dev/null || true
                done
                break
            fi
        fi
    done
    
    # Report parallel results
    local suites=("unit" "integration" "performance" "e2e")
    for i in "${!results[@]}"; do
        local suite="${suites[$i]}"
        local result="${results[$i]}"
        
        if [ $result -eq 0 ]; then
            log_success "${suite} tests: PASSED"
        else
            log_error "${suite} tests: FAILED (exit code $result)"
        fi
    done
    
    return $overall_exit_code
}

# Generate comprehensive test report
generate_final_report() {
    log_header "Generating comprehensive test report"
    
    local total_duration=$(($(date +%s) - START_TIME))
    local overall_success=true
    local suites_run=()
    local suites_passed=()
    local suites_failed=()
    
    # Collect test suite results
    for suite_dir in "$OUTPUT_DIR"/{unit,integration,performance,e2e}; do
        if [ -f "$suite_dir/summary.json" ]; then
            local suite_name=$(basename "$suite_dir")
            suites_run+=("$suite_name")
            
            if jq -r '.success' "$suite_dir/summary.json" | grep -q "true"; then
                suites_passed+=("$suite_name")
            else
                suites_failed+=("$suite_name")
                overall_success=false
            fi
        fi
    done
    
    # Generate master report
    cat > "$OUTPUT_DIR/master-report.json" << EOF
{
    "session_id": "$SESSION_ID",
    "test_mode": "$TEST_MODE",
    "overall_success": $overall_success,
    "total_duration_seconds": $total_duration,
    "configuration": {
        "parallel": $PARALLEL,
        "fail_fast": $FAIL_FAST,
        "verbose": $VERBOSE,
        "timeout": $TIMEOUT,
        "branch": "$BRANCH",
        "commit": "$COMMIT"
    },
    "results": {
        "suites_run": $(printf '%s\n' "${suites_run[@]}" | jq -R . | jq -s .),
        "suites_passed": $(printf '%s\n' "${suites_passed[@]}" | jq -R . | jq -s .),
        "suites_failed": $(printf '%s\n' "${suites_failed[@]}" | jq -R . | jq -s .),
        "success_rate": $(echo "scale=2; ${#suites_passed[@]} / ${#suites_run[@]}" | bc -l 2>/dev/null || echo "0")
    },
    "artifacts": {
        "output_directory": "$OUTPUT_DIR",
        "session_file": "$OUTPUT_DIR/session.json",
        "master_report": "$OUTPUT_DIR/master-report.json"
    },
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

    # Generate HTML report
    generate_html_report
    
    log_success "Comprehensive test report generated"
    log_info "Master report: $OUTPUT_DIR/master-report.json"
    log_info "HTML report: $OUTPUT_DIR/test-report.html"
    
    return $overall_success
}

# Generate HTML test report
generate_html_report() {
    local status_color
    local status_icon
    
    if [ "$overall_success" = true ]; then
        status_color="#22c55e"
        status_icon="✅"
    else
        status_color="#ef4444"
        status_icon="❌"
    fi
    
    cat > "$OUTPUT_DIR/test-report.html" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git Hook Test Report - $SESSION_ID</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f8fafc; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; color: $status_color; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8fafc; padding: 20px; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .suite-results { margin: 30px 0; }
        .suite-card { background: #fafafa; border-radius: 8px; padding: 15px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 Git Hook Test Report</h1>
            <div class="status">$status_icon Test Suite $([ "$overall_success" = true ] && echo "SUCCESS" || echo "FAILURE")</div>
            <p>Session: $SESSION_ID</p>
            <p>Mode: $TEST_MODE</p>
            <p>Duration: ${total_duration}s</p>
        </div>
        
        <div class="grid">
            <div class="card">
                <div class="metric-value">${#suites_run[@]}</div>
                <div>Suites Run</div>
            </div>
            <div class="card">
                <div class="metric-value">${#suites_passed[@]}</div>
                <div>Suites Passed</div>
            </div>
            <div class="card">
                <div class="metric-value">${#suites_failed[@]}</div>
                <div>Suites Failed</div>
            </div>
        </div>
        
        <div class="suite-results">
            <h2>Test Suite Results</h2>
$(for suite in "${suites_run[@]}"; do
    if [[ " ${suites_passed[@]} " =~ " $suite " ]]; then
        echo "            <div class=\"suite-card\" style=\"border-left: 4px solid #22c55e;\">✅ $suite: PASSED</div>"
    else
        echo "            <div class=\"suite-card\" style=\"border-left: 4px solid #ef4444;\">❌ $suite: FAILED</div>"
    fi
done)
        </div>
        
        <div style="text-align: center; margin-top: 40px; color: #64748b;">
            <p>Git Hook Testing Framework - Comprehensive Validation Complete</p>
        </div>
    </div>
</body>
</html>
EOF
}

# Main execution function
main() {
    local START_TIME=$(date +%s)
    local exit_code=0
    
    # Parse arguments
    parse_args "$@"
    
    # Setup environment
    setup_environment
    
    # Initialize Claude Flow coordination
    claude_flow_pre_task
    
    log_header "Starting Git Hook Testing Framework"
    log_info "Mode: $TEST_MODE"
    log_info "Parallel: $PARALLEL"
    log_info "Fail Fast: $FAIL_FAST"
    log_info "Timeout: ${TIMEOUT}s"
    
    # Execute tests based on mode
    case "$TEST_MODE" in
        unit)
            run_unit_tests
            exit_code=$?
            ;;
        integration)
            run_integration_tests
            exit_code=$?
            ;;
        performance)
            run_performance_tests
            exit_code=$?
            ;;
        e2e)
            run_e2e_tests
            exit_code=$?
            ;;
        full)
            if [ "$PARALLEL" = true ]; then
                run_parallel_tests
                exit_code=$?
            else
                run_unit_tests
                local unit_exit=$?
                
                if [ $unit_exit -ne 0 ] && [ "$FAIL_FAST" = true ]; then
                    exit_code=$unit_exit
                else
                    run_integration_tests
                    local integration_exit=$?
                    
                    if [ $integration_exit -ne 0 ] && [ "$FAIL_FAST" = true ]; then
                        exit_code=$integration_exit
                    else
                        run_performance_tests
                        local performance_exit=$?
                        
                        if [ $performance_exit -ne 0 ] && [ "$FAIL_FAST" = true ]; then
                            exit_code=$performance_exit
                        else
                            run_e2e_tests
                            local e2e_exit=$?
                            
                            # Overall exit code is failure if any suite failed
                            exit_code=$(( unit_exit + integration_exit + performance_exit + e2e_exit ))
                            [ $exit_code -gt 0 ] && exit_code=1
                        fi
                    fi
                fi
            fi
            ;;
        ci)
            run_ci_tests
            exit_code=$?
            ;;
        quick)
            run_quick_tests
            exit_code=$?
            ;;
        *)
            log_error "Unknown test mode: $TEST_MODE"
            show_help
            exit 1
            ;;
    esac
    
    # Generate final report
    generate_final_report
    report_success=$?
    
    # Finalize Claude Flow coordination
    claude_flow_post_task
    claude_flow_session_end
    
    # Final status
    local total_duration=$(($(date +%s) - START_TIME))
    
    if [ $exit_code -eq 0 ] && [ $report_success ]; then
        log_success "Git hook testing completed successfully in ${total_duration}s"
        log_info "All test suites passed - Git hooks are ready for production"
    else
        log_error "Git hook testing failed with exit code $exit_code after ${total_duration}s"
        log_warning "Review test reports and fix issues before deployment"
    fi
    
    log_info "Test session: $SESSION_ID"
    log_info "Reports available in: $OUTPUT_DIR"
    
    exit $exit_code
}

# Execute main function with all arguments
main "$@"
#!/bin/bash
# Git Hook Integration Test Runner
# ================================
#
# Comprehensive shell script for running Git hook integration tests with
# advanced features including parallel execution, performance monitoring,
# environment setup, and detailed reporting.
#
# Author: Test Infrastructure Team
# Version: 2.0.0
# Dependencies: bash 4+, git, python3, node.js (optional), jq (optional)

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
TEST_WORKSPACE="$PROJECT_ROOT/.claude_workspace/test_runs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RUN_ID="git_hook_tests_$TIMESTAMP"

# Default configuration
DEFAULT_TIMEOUT=600
DEFAULT_PARALLEL_JOBS=4
DEFAULT_TEST_TYPES="unit,integration,performance"
DEFAULT_OUTPUT_FORMAT="both"
DEFAULT_CLEANUP=true
DEFAULT_VERBOSE=false
DEFAULT_CONTINUE_ON_FAILURE=true

# Configuration variables (can be overridden by environment or CLI)
TIMEOUT="${TIMEOUT:-$DEFAULT_TIMEOUT}"
PARALLEL_JOBS="${PARALLEL_JOBS:-$DEFAULT_PARALLEL_JOBS}"
TEST_TYPES="${TEST_TYPES:-$DEFAULT_TEST_TYPES}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-$DEFAULT_OUTPUT_FORMAT}"
CLEANUP="${CLEANUP:-$DEFAULT_CLEANUP}"
VERBOSE="${VERBOSE:-$DEFAULT_VERBOSE}"
CONTINUE_ON_FAILURE="${CONTINUE_ON_FAILURE:-$DEFAULT_CONTINUE_ON_FAILURE}"

# Test execution tracking
declare -A TEST_RESULTS
declare -A TEST_TIMES
declare -A TEST_OUTPUTS
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
START_TIME=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

debug() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${PURPLE}[DEBUG]${NC} $*"
    fi
}

# Help function
show_help() {
    cat << EOF
Git Hook Integration Test Runner v2.0.0

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help                 Show this help message
    -t, --timeout SECONDS      Test timeout in seconds (default: $DEFAULT_TIMEOUT)
    -j, --jobs NUMBER          Number of parallel jobs (default: $DEFAULT_PARALLEL_JOBS)
    -T, --types TYPES          Comma-separated test types (default: $DEFAULT_TEST_TYPES)
                              Available: unit,integration,performance,e2e,stress
    -f, --format FORMAT        Output format: json,html,both (default: $DEFAULT_OUTPUT_FORMAT)
    -c, --no-cleanup          Don't cleanup test artifacts after completion
    -v, --verbose             Enable verbose output
    -s, --stop-on-failure     Stop execution on first failure
    -w, --workspace DIR       Test workspace directory (default: auto-generated)
    -e, --environment FILE    Environment configuration file
    -r, --reports-only        Only generate reports from existing results
    --dry-run                 Show what would be executed without running

EXAMPLES:
    # Run all tests with default settings
    $0

    # Run only unit and integration tests with 8 parallel jobs
    $0 --types unit,integration --jobs 8

    # Run performance tests with verbose output
    $0 --types performance --verbose

    # Generate reports from existing results
    $0 --reports-only

    # Run with custom timeout and stop on first failure
    $0 --timeout 300 --stop-on-failure

ENVIRONMENT VARIABLES:
    TEST_WORKSPACE           Override default workspace location
    CLAUDE_FLOW_DISABLE      Disable Claude Flow integration
    GIT_HOOKS_DISABLE        Disable Git hook installation
    PERFORMANCE_MODE         Enable performance optimizations
    CI_MODE                  Enable CI-specific optimizations

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--timeout)
                TIMEOUT="$2"
                shift 2
                ;;
            -j|--jobs)
                PARALLEL_JOBS="$2"
                shift 2
                ;;
            -T|--types)
                TEST_TYPES="$2"
                shift 2
                ;;
            -f|--format)
                OUTPUT_FORMAT="$2"
                shift 2
                ;;
            -c|--no-cleanup)
                CLEANUP=false
                shift
                ;;
            -v|--verbose)
                VERBOSE=true
                shift
                ;;
            -s|--stop-on-failure)
                CONTINUE_ON_FAILURE=false
                shift
                ;;
            -w|--workspace)
                TEST_WORKSPACE="$2"
                shift 2
                ;;
            -e|--environment)
                ENVIRONMENT_FILE="$2"
                shift 2
                ;;
            -r|--reports-only)
                REPORTS_ONLY=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# System requirements check
check_requirements() {
    log "Checking system requirements..."
    
    local requirements_met=true
    
    # Check bash version
    if [ "${BASH_VERSION%%.*}" -lt 4 ]; then
        error "Bash 4.0 or higher required (current: $BASH_VERSION)"
        requirements_met=false
    fi
    
    # Check required commands
    local required_commands=("git" "python3" "pytest")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command not found: $cmd"
            requirements_met=false
        else
            debug "Found $cmd: $(command -v "$cmd")"
        fi
    done
    
    # Check optional commands
    local optional_commands=("node" "npm" "npx" "jq")
    for cmd in "${optional_commands[@]}"; do
        if command -v "$cmd" &> /dev/null; then
            debug "Found optional $cmd: $(command -v "$cmd")"
        else
            debug "Optional command not available: $cmd"
        fi
    done
    
    # Check Python packages
    local python_packages=("pytest" "git" "asyncio")
    for package in "${python_packages[@]}"; do
        if ! python3 -c "import $package" 2>/dev/null; then
            warn "Python package not available: $package"
        else
            debug "Python package available: $package"
        fi
    done
    
    if [ "$requirements_met" = false ]; then
        error "System requirements not met. Please install missing dependencies."
        exit 1
    fi
    
    success "System requirements check passed"
}

# Environment setup
setup_environment() {
    log "Setting up test environment..."
    
    # Create workspace structure
    mkdir -p "$TEST_WORKSPACE"/{runs,reports,artifacts,config,logs}
    
    # Set environment variables
    export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
    export TEST_RUN_ID="$RUN_ID"
    export TEST_WORKSPACE_DIR="$TEST_WORKSPACE"
    export GIT_HOOKS_TEST_MODE=true
    
    # Create run-specific directory
    RUN_DIR="$TEST_WORKSPACE/runs/$RUN_ID"
    mkdir -p "$RUN_DIR"/{results,logs,artifacts}
    
    # Load environment configuration if specified
    if [ -n "${ENVIRONMENT_FILE:-}" ] && [ -f "$ENVIRONMENT_FILE" ]; then
        info "Loading environment configuration: $ENVIRONMENT_FILE"
        
        # Source shell environment file or parse JSON
        if [[ "$ENVIRONMENT_FILE" =~ \.sh$ ]]; then
            # shellcheck source=/dev/null
            source "$ENVIRONMENT_FILE"
        elif [[ "$ENVIRONMENT_FILE" =~ \.json$ ]] && command -v jq &> /dev/null; then
            # Parse JSON environment file
            while IFS="=" read -r key value; do
                export "$key"="$value"
                debug "Set environment variable: $key=$value"
            done < <(jq -r 'to_entries[] | "\(.key)=\(.value)"' "$ENVIRONMENT_FILE")
        else
            warn "Unsupported environment file format: $ENVIRONMENT_FILE"
        fi
    fi
    
    # Performance mode optimizations
    if [ "${PERFORMANCE_MODE:-false}" = true ]; then
        info "Performance mode enabled"
        export PYTHONDONTWRITEBYTECODE=1
        export PYTHONUNBUFFERED=1
        # Increase parallel jobs for performance mode
        PARALLEL_JOBS=$((PARALLEL_JOBS * 2))
    fi
    
    # CI mode optimizations
    if [ "${CI_MODE:-false}" = true ] || [ -n "${CI:-}" ]; then
        info "CI mode detected"
        VERBOSE=true
        OUTPUT_FORMAT="json"
        # CI-specific timeouts
        TIMEOUT=$((TIMEOUT / 2))
    fi
    
    success "Environment setup completed"
    debug "Run directory: $RUN_DIR"
    debug "Parallel jobs: $PARALLEL_JOBS"
    debug "Timeout: $TIMEOUT seconds"
}

# Test discovery
discover_tests() {
    log "Discovering tests..."
    
    local test_files=()
    local test_base_dir="$SCRIPT_DIR"
    
    # Convert test types to array
    IFS=',' read -ra TYPE_ARRAY <<< "$TEST_TYPES"
    
    for test_type in "${TYPE_ARRAY[@]}"; do
        debug "Discovering $test_type tests..."
        
        case "$test_type" in
            unit)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$test_base_dir" -name "*_test_suite.py" -o -name "test_*_unit.py")
                ;;
            integration)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$test_base_dir" -name "*_integration_test_runner.py" -o -name "test_*_integration.py")
                ;;
            performance)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$test_base_dir" -name "*_performance_benchmarks.py" -o -name "test_*_performance.py")
                ;;
            e2e)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$PROJECT_ROOT/tests" -name "*e2e*.py" -o -name "*_e2e_*.py")
                ;;
            stress)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$test_base_dir" -name "*_stress_*.py" -o -name "stress_*.py")
                ;;
            automation)
                mapfile -t -O "${#test_files[@]}" test_files < <(find "$test_base_dir" -name "*_test_automation.py")
                ;;
            *)
                warn "Unknown test type: $test_type"
                ;;
        esac
    done
    
    # Remove duplicates and non-existent files
    local unique_files=()
    declare -A seen_files
    
    for file in "${test_files[@]}"; do
        if [ -f "$file" ] && [ -z "${seen_files[$file]:-}" ]; then
            unique_files+=("$file")
            seen_files["$file"]=1
        fi
    done
    
    test_files=("${unique_files[@]}")
    TOTAL_TESTS=${#test_files[@]}
    
    if [ $TOTAL_TESTS -eq 0 ]; then
        error "No tests found for types: $TEST_TYPES"
        exit 1
    fi
    
    info "Discovered $TOTAL_TESTS test files"
    
    # Save test list
    printf '%s\n' "${test_files[@]}" > "$RUN_DIR/test_list.txt"
    
    # Display discovered tests
    if [ "$VERBOSE" = true ]; then
        debug "Discovered test files:"
        for file in "${test_files[@]}"; do
            debug "  - $(basename "$file")"
        done
    fi
}

# Individual test execution
execute_single_test() {
    local test_file="$1"
    local test_index="$2"
    local test_name
    test_name=$(basename "$test_file" .py)
    
    debug "Executing test: $test_name ($test_index/$TOTAL_TESTS)"
    
    local start_time
    start_time=$(date +%s.%N)
    
    local test_log="$RUN_DIR/logs/${test_name}_${test_index}.log"
    local test_result_file="$RUN_DIR/results/${test_name}_${test_index}.json"
    
    # Prepare test execution environment
    local test_env_vars=(
        "TEST_NAME=$test_name"
        "TEST_INDEX=$test_index"
        "TEST_LOG_FILE=$test_log"
        "TEST_RESULT_FILE=$test_result_file"
        "PYTHONPATH=$PROJECT_ROOT"
    )
    
    # Execute test with timeout
    local exit_code=0
    local test_output=""
    
    if [ "${DRY_RUN:-false}" = true ]; then
        info "[DRY RUN] Would execute: python3 -m pytest $test_file"
        exit_code=0
        test_output="[DRY RUN] Test execution skipped"
    else
        # Run the test
        if timeout "$TIMEOUT" env "${test_env_vars[@]}" \
           python3 -m pytest "$test_file" \
           --verbose \
           --tb=short \
           --no-header \
           --json-report \
           --json-report-file="$test_result_file" \
           > "$test_log" 2>&1; then
            exit_code=0
        else
            exit_code=$?
        fi
        
        test_output=$(cat "$test_log" 2>/dev/null || echo "No output available")
    fi
    
    local end_time
    end_time=$(date +%s.%N)
    local duration
    duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    
    # Store results
    TEST_RESULTS["$test_name"]=$exit_code
    TEST_TIMES["$test_name"]=$duration
    TEST_OUTPUTS["$test_name"]="$test_output"
    
    # Update counters
    if [ $exit_code -eq 0 ]; then
        ((PASSED_TESTS++))
        success "✅ $test_name (${duration}s)"
    else
        ((FAILED_TESTS++))
        error "❌ $test_name (exit code: $exit_code, ${duration}s)"
        
        if [ "$VERBOSE" = true ]; then
            error "Test output for $test_name:"
            echo "$test_output" | head -20
            if [ "$(echo "$test_output" | wc -l)" -gt 20 ]; then
                echo "... (output truncated, see $test_log for full output)"
            fi
        fi
        
        # Stop on failure if requested
        if [ "$CONTINUE_ON_FAILURE" = false ]; then
            error "Stopping execution due to test failure (--stop-on-failure)"
            return 1
        fi
    fi
    
    return $exit_code
}

# Parallel test execution
execute_tests_parallel() {
    log "Executing tests with $PARALLEL_JOBS parallel jobs..."
    
    # Read test files
    mapfile -t test_files < "$RUN_DIR/test_list.txt"
    
    # Create job control
    local job_count=0
    local pids=()
    
    # Execute tests in parallel batches
    for i in "${!test_files[@]}"; do
        local test_file="${test_files[$i]}"
        local test_index=$((i + 1))
        
        # Wait if we've reached the parallel limit
        while [ $job_count -ge $PARALLEL_JOBS ]; do
            # Wait for any job to complete
            for j in "${!pids[@]}"; do
                local pid="${pids[$j]}"
                if ! kill -0 "$pid" 2>/dev/null; then
                    # Job completed, remove from tracking
                    wait "$pid"
                    unset "pids[$j]"
                    ((job_count--))
                    break
                fi
            done
            sleep 0.1
        done
        
        # Start new test in background
        (execute_single_test "$test_file" "$test_index") &
        local new_pid=$!
        pids+=("$new_pid")
        ((job_count++))
        
        debug "Started test $test_index in background (PID: $new_pid)"
    done
    
    # Wait for all remaining jobs to complete
    info "Waiting for remaining tests to complete..."
    for pid in "${pids[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            wait "$pid"
        fi
    done
    
    success "All tests completed"
}

# Sequential test execution
execute_tests_sequential() {
    log "Executing tests sequentially..."
    
    # Read test files
    mapfile -t test_files < "$RUN_DIR/test_list.txt"
    
    for i in "${!test_files[@]}"; do
        local test_file="${test_files[$i]}"
        local test_index=$((i + 1))
        
        if ! execute_single_test "$test_file" "$test_index"; then
            if [ "$CONTINUE_ON_FAILURE" = false ]; then
                error "Stopping execution due to test failure"
                break
            fi
        fi
    done
    
    success "Sequential test execution completed"
}

# Main test execution
execute_tests() {
    if [ "${REPORTS_ONLY:-false}" = true ]; then
        info "Skipping test execution (reports-only mode)"
        return 0
    fi
    
    log "Starting test execution..."
    
    # Choose execution mode
    if [ "$PARALLEL_JOBS" -gt 1 ] && [ $TOTAL_TESTS -gt 1 ]; then
        execute_tests_parallel
    else
        execute_tests_sequential
    fi
    
    # Calculate final statistics
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    info "Test execution summary:"
    info "  Total tests: $TOTAL_TESTS"
    info "  Passed: $PASSED_TESTS"
    info "  Failed: $FAILED_TESTS"
    info "  Success rate: $(( PASSED_TESTS * 100 / TOTAL_TESTS ))%"
    info "  Total duration: ${total_duration}s"
}

# Performance analysis
analyze_performance() {
    log "Analyzing test performance..."
    
    local performance_file="$RUN_DIR/performance_analysis.json"
    
    # Calculate performance statistics
    local total_time=0
    local min_time=999999
    local max_time=0
    local test_count=0
    
    for test_name in "${!TEST_TIMES[@]}"; do
        local time="${TEST_TIMES[$test_name]}"
        total_time=$(echo "$total_time + $time" | bc -l)
        
        if (( $(echo "$time < $min_time" | bc -l) )); then
            min_time=$time
        fi
        
        if (( $(echo "$time > $max_time" | bc -l) )); then
            max_time=$time
        fi
        
        ((test_count++))
    done
    
    local avg_time
    if [ $test_count -gt 0 ]; then
        avg_time=$(echo "scale=3; $total_time / $test_count" | bc -l)
    else
        avg_time=0
    fi
    
    # Create performance report
    cat > "$performance_file" << EOF
{
  "performance_analysis": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "run_id": "$RUN_ID",
    "summary": {
      "total_execution_time": $total_time,
      "average_test_time": $avg_time,
      "minimum_test_time": $min_time,
      "maximum_test_time": $max_time,
      "test_count": $test_count
    },
    "individual_tests": {
EOF
    
    # Add individual test times
    local first=true
    for test_name in "${!TEST_TIMES[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$performance_file"
        fi
        echo "      \"$test_name\": ${TEST_TIMES[$test_name]}" >> "$performance_file"
    done
    
    cat >> "$performance_file" << EOF
    }
  }
}
EOF
    
    debug "Performance analysis saved to: $performance_file"
}

# Generate JSON report
generate_json_report() {
    local report_file="$TEST_WORKSPACE/reports/git_hook_tests_$TIMESTAMP.json"
    
    log "Generating JSON report: $report_file"
    
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    cat > "$report_file" << EOF
{
  "test_execution_report": {
    "metadata": {
      "run_id": "$RUN_ID",
      "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "script_version": "2.0.0",
      "execution_mode": "$([ "$PARALLEL_JOBS" -gt 1 ] && echo "parallel" || echo "sequential")",
      "parallel_jobs": $PARALLEL_JOBS,
      "timeout": $TIMEOUT
    },
    "configuration": {
      "test_types": "$TEST_TYPES",
      "workspace": "$TEST_WORKSPACE",
      "continue_on_failure": $CONTINUE_ON_FAILURE,
      "cleanup": $CLEANUP,
      "verbose": $VERBOSE
    },
    "summary": {
      "total_tests": $TOTAL_TESTS,
      "passed_tests": $PASSED_TESTS,
      "failed_tests": $FAILED_TESTS,
      "skipped_tests": $SKIPPED_TESTS,
      "success_rate": $(( PASSED_TESTS * 100 / (TOTAL_TESTS > 0 ? TOTAL_TESTS : 1) )),
      "total_duration_seconds": $total_duration
    },
    "test_results": [
EOF
    
    # Add individual test results
    local first=true
    for test_name in "${!TEST_RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "$report_file"
        fi
        
        local exit_code="${TEST_RESULTS[$test_name]}"
        local duration="${TEST_TIMES[$test_name]}"
        local status
        
        if [ "$exit_code" -eq 0 ]; then
            status="passed"
        else
            status="failed"
        fi
        
        cat >> "$report_file" << EOF
      {
        "test_name": "$test_name",
        "status": "$status",
        "exit_code": $exit_code,
        "duration_seconds": $duration,
        "log_file": "$RUN_DIR/logs/${test_name}.log"
      }
EOF
    done
    
    cat >> "$report_file" << EOF
    ]
  }
}
EOF
    
    success "JSON report generated: $report_file"
}

# Generate HTML report
generate_html_report() {
    local report_file="$TEST_WORKSPACE/reports/git_hook_tests_$TIMESTAMP.html"
    
    log "Generating HTML report: $report_file"
    
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    local success_rate=$(( PASSED_TESTS * 100 / (TOTAL_TESTS > 0 ? TOTAL_TESTS : 1) ))
    
    cat > "$report_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Git Hook Tests Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 40px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { border: 1px solid #ddd; border-radius: 8px; padding: 20px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; }
        .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
        .passed { background-color: #d4edda; }
        .failed { background-color: #f8d7da; }
        .neutral { background-color: #f8f9fa; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f5f5f5; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .duration { font-family: monospace; }
        .progress-bar { width: 100%; height: 20px; background-color: #f0f0f0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔗 Git Hook Integration Tests Report</h1>
        <p>Generated on <strong>REPORT_TIMESTAMP</strong></p>
        <p>Run ID: <code>RUN_ID_PLACEHOLDER</code></p>
    </div>
    
    <div class="summary">
        <div class="metric neutral">
            <div class="metric-value">TOTAL_TESTS_PLACEHOLDER</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric passed">
            <div class="metric-value">PASSED_TESTS_PLACEHOLDER</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric failed">
            <div class="metric-value">FAILED_TESTS_PLACEHOLDER</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric neutral">
            <div class="metric-value">SUCCESS_RATE_PLACEHOLDER%</div>
            <div class="metric-label">Success Rate</div>
        </div>
        <div class="metric neutral">
            <div class="metric-value">DURATION_PLACEHOLDER</div>
            <div class="metric-label">Duration</div>
        </div>
    </div>
    
    <div class="progress-bar">
        <div class="progress-fill" style="width: SUCCESS_RATE_PLACEHOLDER%; background-color: SUCCESS_RATE_COLOR;"></div>
    </div>
    
    <h3>📋 Test Results</h3>
    <table>
        <thead>
            <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
TEST_RESULTS_PLACEHOLDER
        </tbody>
    </table>
    
    <h3>📊 Configuration</h3>
    <table>
        <tr><th>Setting</th><th>Value</th></tr>
        <tr><td>Test Types</td><td>TEST_TYPES_PLACEHOLDER</td></tr>
        <tr><td>Parallel Jobs</td><td>PARALLEL_JOBS_PLACEHOLDER</td></tr>
        <tr><td>Timeout</td><td>TIMEOUT_PLACEHOLDER seconds</td></tr>
        <tr><td>Continue on Failure</td><td>CONTINUE_ON_FAILURE_PLACEHOLDER</td></tr>
        <tr><td>Workspace</td><td>WORKSPACE_PLACEHOLDER</td></tr>
    </table>
    
    <footer style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Git Hook Test Runner v2.0.0</p>
    </footer>
</body>
</html>
EOF
    
    # Replace placeholders
    sed -i.bak "s|REPORT_TIMESTAMP|$(date)|g" "$report_file"
    sed -i.bak "s|RUN_ID_PLACEHOLDER|$RUN_ID|g" "$report_file"
    sed -i.bak "s|TOTAL_TESTS_PLACEHOLDER|$TOTAL_TESTS|g" "$report_file"
    sed -i.bak "s|PASSED_TESTS_PLACEHOLDER|$PASSED_TESTS|g" "$report_file"
    sed -i.bak "s|FAILED_TESTS_PLACEHOLDER|$FAILED_TESTS|g" "$report_file"
    sed -i.bak "s|SUCCESS_RATE_PLACEHOLDER|$success_rate|g" "$report_file"
    sed -i.bak "s|DURATION_PLACEHOLDER|${total_duration}s|g" "$report_file"
    sed -i.bak "s|TEST_TYPES_PLACEHOLDER|$TEST_TYPES|g" "$report_file"
    sed -i.bak "s|PARALLEL_JOBS_PLACEHOLDER|$PARALLEL_JOBS|g" "$report_file"
    sed -i.bak "s|TIMEOUT_PLACEHOLDER|$TIMEOUT|g" "$report_file"
    sed -i.bak "s|CONTINUE_ON_FAILURE_PLACEHOLDER|$CONTINUE_ON_FAILURE|g" "$report_file"
    sed -i.bak "s|WORKSPACE_PLACEHOLDER|$TEST_WORKSPACE|g" "$report_file"
    
    # Determine success rate color
    local success_color="#28a745"  # Green
    if [ $success_rate -lt 80 ]; then
        success_color="#ffc107"  # Yellow
    fi
    if [ $success_rate -lt 60 ]; then
        success_color="#dc3545"  # Red
    fi
    sed -i.bak "s|SUCCESS_RATE_COLOR|$success_color|g" "$report_file"
    
    # Generate test results table
    local test_results_html=""
    for test_name in "${!TEST_RESULTS[@]}"; do
        local exit_code="${TEST_RESULTS[$test_name]}"
        local duration="${TEST_TIMES[$test_name]}"
        local status_class="status-passed"
        local status_text="✅ PASSED"
        
        if [ "$exit_code" -ne 0 ]; then
            status_class="status-failed"
            status_text="❌ FAILED"
        fi
        
        test_results_html+="            <tr>
                <td>$test_name</td>
                <td class=\"$status_class\">$status_text</td>
                <td class=\"duration\">${duration}s</td>
                <td><a href=\"$RUN_DIR/logs/${test_name}.log\">View Log</a></td>
            </tr>\n"
    done
    
    # Replace test results placeholder
    if command -v perl &> /dev/null; then
        perl -i -pe "s|TEST_RESULTS_PLACEHOLDER|$test_results_html|g" "$report_file"
    else
        # Fallback using sed (may not handle multiline properly)
        sed -i.bak "s|TEST_RESULTS_PLACEHOLDER|$test_results_html|g" "$report_file"
    fi
    
    # Cleanup backup files
    rm -f "$report_file.bak"
    
    success "HTML report generated: $report_file"
}

# Generate reports
generate_reports() {
    log "Generating test reports..."
    
    # Analyze performance first
    analyze_performance
    
    case "$OUTPUT_FORMAT" in
        json)
            generate_json_report
            ;;
        html)
            generate_html_report
            ;;
        both)
            generate_json_report
            generate_html_report
            ;;
        *)
            warn "Unknown output format: $OUTPUT_FORMAT, generating both"
            generate_json_report
            generate_html_report
            ;;
    esac
    
    success "Report generation completed"
}

# Cleanup function
cleanup_artifacts() {
    if [ "$CLEANUP" = true ]; then
        log "Cleaning up test artifacts..."
        
        # Keep reports and results, clean temporary files
        find "$RUN_DIR" -name "*.tmp" -delete 2>/dev/null || true
        find "$RUN_DIR" -name "*.pyc" -delete 2>/dev/null || true
        find "$RUN_DIR" -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
        
        # Compress large log files
        find "$RUN_DIR/logs" -name "*.log" -size +1M -exec gzip {} \; 2>/dev/null || true
        
        debug "Cleanup completed"
    else
        debug "Cleanup skipped (--no-cleanup specified)"
    fi
}

# Signal handlers
cleanup_on_exit() {
    local exit_code=$?
    
    if [ $exit_code -ne 0 ]; then
        error "Script interrupted or failed with exit code: $exit_code"
    fi
    
    # Kill any remaining background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Generate reports from partial results
    if [ ${#TEST_RESULTS[@]} -gt 0 ]; then
        warn "Generating reports from partial results..."
        generate_reports
    fi
    
    cleanup_artifacts
    
    exit $exit_code
}

# Set up signal handlers
trap cleanup_on_exit EXIT
trap 'exit 130' INT  # Ctrl+C
trap 'exit 143' TERM # Termination

# Main execution function
main() {
    log "Git Hook Integration Test Runner v2.0.0"
    log "========================================="
    
    # Parse arguments
    parse_arguments "$@"
    
    # Show configuration
    info "Configuration:"
    info "  Test Types: $TEST_TYPES"
    info "  Parallel Jobs: $PARALLEL_JOBS"
    info "  Timeout: $TIMEOUT seconds"
    info "  Output Format: $OUTPUT_FORMAT"
    info "  Workspace: $TEST_WORKSPACE"
    info "  Continue on Failure: $CONTINUE_ON_FAILURE"
    info "  Cleanup: $CLEANUP"
    info "  Verbose: $VERBOSE"
    
    # Check requirements
    check_requirements
    
    # Setup environment
    setup_environment
    
    # Discover tests
    discover_tests
    
    # Execute tests
    execute_tests
    
    # Generate reports
    generate_reports
    
    # Final summary
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - START_TIME))
    
    log "==============================================="
    log "Test execution completed successfully!"
    log "  Total tests: $TOTAL_TESTS"
    log "  Passed: $PASSED_TESTS"
    log "  Failed: $FAILED_TESTS"
    log "  Success rate: $(( PASSED_TESTS * 100 / (TOTAL_TESTS > 0 ? TOTAL_TESTS : 1) ))%"
    log "  Total duration: ${total_duration}s"
    log "  Reports: $TEST_WORKSPACE/reports/"
    log "==============================================="
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function with all arguments
main "$@"
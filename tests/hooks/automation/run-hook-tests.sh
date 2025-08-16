#!/bin/bash

# Comprehensive Hook Testing Framework - Automated Execution Script
# 
# This script orchestrates the complete hook testing suite including:
# - Environment setup and validation
# - Functional, performance, integration, and stress testing
# - Report generation and analysis
# - CI/CD integration and exit status determination

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HOOK_TEST_CONFIG="${HOOK_TEST_CONFIG:-$PROJECT_ROOT/tests/hooks/config/test-config.json}"
REPORT_OUTPUT="${REPORT_OUTPUT:-$PROJECT_ROOT/.claude_workspace/reports/hook-tests}"
TIMEOUT="${TIMEOUT:-600}" # 10 minutes
PARALLEL="${PARALLEL:-false}"
SKIP_STRESS="${SKIP_STRESS:-false}"
VERBOSE="${VERBOSE:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_header() {
    echo -e "\n${BLUE}$1${NC}"
    echo -e "${BLUE}${1//./=}${NC}"
}

# Error handling
cleanup() {
    local exit_code=$?
    log_info "Cleaning up test environment..."
    
    # Stop any running services
    if [ -f "$PROJECT_ROOT/tests/hooks/docker-compose.test.yml" ]; then
        docker-compose -f "$PROJECT_ROOT/tests/hooks/docker-compose.test.yml" down &>/dev/null || true
    fi
    
    # Kill any background processes
    pkill -f "hook-test" &>/dev/null || true
    
    # Clean up temporary files
    find "$REPORT_OUTPUT" -name "*.tmp" -delete 2>/dev/null || true
    
    if [ "$exit_code" -ne 0 ]; then
        log_error "Hook testing failed with exit code $exit_code"
        
        # Generate failure report
        generate_failure_report "$exit_code"
    fi
    
    exit "$exit_code"
}

trap cleanup EXIT

# Validation functions
validate_environment() {
    log_info "Validating test environment..."
    
    # Check required commands
    local required_commands=("node" "npm" "docker" "docker-compose")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            return 1
        fi
    done
    
    # Check Node.js version
    local node_version
    node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    if ! version_greater_equal "$node_version" "$required_version"; then
        log_error "Node.js version $node_version is too old. Required: $required_version+"
        return 1
    fi
    
    # Check project structure
    local required_dirs=("tests/hooks" "src" "package.json")
    for dir in "${required_dirs[@]}"; do
        if [ ! -e "$PROJECT_ROOT/$dir" ]; then
            log_error "Required project structure missing: $dir"
            return 1
        fi
    done
    
    # Check test configuration
    if [ ! -f "$HOOK_TEST_CONFIG" ]; then
        log_warning "Hook test config not found, using defaults"
        create_default_config
    fi
    
    log_success "Environment validation passed"
    return 0
}

version_greater_equal() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

create_default_config() {
    local config_dir
    config_dir="$(dirname "$HOOK_TEST_CONFIG")"
    mkdir -p "$config_dir"
    
    cat > "$HOOK_TEST_CONFIG" << 'EOF'
{
  "timeout": 600000,
  "hooks": {
    "pre-task": {
      "enabled": true,
      "performanceThreshold": 500,
      "successRateThreshold": 0.99
    },
    "post-edit": {
      "enabled": true,
      "performanceThreshold": 200,
      "successRateThreshold": 0.995
    },
    "post-task": {
      "enabled": true,
      "performanceThreshold": 1000,
      "successRateThreshold": 0.98
    },
    "session-end": {
      "enabled": true,
      "performanceThreshold": 2000,
      "successRateThreshold": 0.95
    }
  },
  "testScenarios": {
    "functional": true,
    "performance": true,
    "integration": true,
    "stress": true
  },
  "reporting": {
    "generateHTML": true,
    "generateJSON": true,
    "includeScreenshots": true
  }
}
EOF
    
    log_info "Created default hook test configuration: $HOOK_TEST_CONFIG"
}

# Service management
start_test_services() {
    log_info "Starting test services..."
    
    # Ensure output directory exists
    mkdir -p "$REPORT_OUTPUT"
    
    # Start Docker services if compose file exists
    local compose_file="$PROJECT_ROOT/tests/hooks/docker-compose.test.yml"
    if [ -f "$compose_file" ]; then
        log_info "Starting Docker test services..."
        docker-compose -f "$compose_file" up -d
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        local max_attempts=30
        local attempt=0
        
        while [ $attempt -lt $max_attempts ]; do
            if curl -s http://localhost:8000/health &>/dev/null; then
                log_success "Test services are ready"
                break
            fi
            
            sleep 2
            ((attempt++))
        done
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Test services failed to start within timeout"
            return 1
        fi
    else
        log_info "No Docker compose file found, skipping service startup"
    fi
    
    # Start application services
    if [ -f "$PROJECT_ROOT/package.json" ]; then
        log_info "Installing dependencies..."
        cd "$PROJECT_ROOT"
        npm ci &>/dev/null
        
        # Start development server in background if not already running
        if ! curl -s http://localhost:3000 &>/dev/null; then
            log_info "Starting development server..."
            npm run dev &
            local dev_pid=$!
            
            # Wait for dev server to be ready
            local attempts=0
            while [ $attempts -lt 30 ]; do
                if curl -s http://localhost:3000 &>/dev/null; then
                    log_success "Development server is ready"
                    break
                fi
                sleep 2
                ((attempts++))
            done
            
            if [ $attempts -eq 30 ]; then
                log_error "Development server failed to start"
                kill $dev_pid &>/dev/null || true
                return 1
            fi
        else
            log_info "Development server already running"
        fi
    fi
    
    return 0
}

# Test execution phases
run_test_phase() {
    local phase=$1
    local description="$2"
    
    log_header "$description"
    
    local phase_start_time
    phase_start_time=$(date +%s)
    local phase_output="$REPORT_OUTPUT/$phase"
    mkdir -p "$phase_output"
    
    case $phase in
        "functional")
            run_functional_tests "$phase_output"
            ;;
        "performance")
            run_performance_tests "$phase_output"
            ;;
        "integration")
            run_integration_tests "$phase_output"
            ;;
        "stress")
            if [ "$SKIP_STRESS" != "true" ]; then
                run_stress_tests "$phase_output"
            else
                log_info "Skipping stress tests as requested"
                return 0
            fi
            ;;
        *)
            log_error "Unknown test phase: $phase"
            return 1
            ;;
    esac
    
    local phase_result=$?
    local phase_end_time
    phase_end_time=$(date +%s)
    local phase_duration=$((phase_end_time - phase_start_time))
    
    # Record phase metrics
    cat > "$phase_output/metrics.json" << EOF
{
  "phase": "$phase",
  "description": "$description",
  "startTime": $phase_start_time,
  "endTime": $phase_end_time,
  "duration": $phase_duration,
  "success": $([ $phase_result -eq 0 ] && echo "true" || echo "false")
}
EOF
    
    if [ $phase_result -eq 0 ]; then
        log_success "$description completed successfully (${phase_duration}s)"
    else
        log_error "$description failed (${phase_duration}s)"
    fi
    
    return $phase_result
}

run_functional_tests() {
    local output_dir="$1"
    
    log_info "Running functional hook tests..."
    
    # Run the main hook test runner
    cd "$PROJECT_ROOT"
    
    local runner_args=""
    if [ "$VERBOSE" = "true" ]; then
        runner_args="$runner_args --verbose"
    fi
    
    timeout "$TIMEOUT" node tests/hooks/automation/hook-test-runner.js \
        --output "$output_dir" \
        --timeout $((TIMEOUT - 60)) \
        "$runner_args" \
        functional
    
    local result=$?
    
    # Validate functional test results
    if [ $result -eq 0 ] && [ -f "$output_dir/hook-test-report.json" ]; then
        local success_rate
        success_rate=$(jq -r '.summary.successRate // 0' "$output_dir/hook-test-report.json")
        if (( $(echo "$success_rate < 0.95" | bc -l) )); then
            log_warning "Functional tests passed but success rate is below 95%: $success_rate"
            result=1
        fi
    fi
    
    return $result
}

run_performance_tests() {
    local output_dir="$1"
    
    log_info "Running performance benchmark tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run performance-specific tests
    timeout "$TIMEOUT" node tests/hooks/automation/hook-test-runner.js \
        --output "$output_dir" \
        --timeout $((TIMEOUT - 60)) \
        performance
    
    local result=$?
    
    # Check for performance regressions
    if [ $result -eq 0 ] && [ -f "$output_dir/performance-benchmark.json" ]; then
        log_info "Checking for performance regressions..."
        
        local baseline_file="$PROJECT_ROOT/tests/hooks/baselines/performance-baseline.json"
        if [ -f "$baseline_file" ]; then
            node "$SCRIPT_DIR/check-regressions.js" \
                --current "$output_dir/performance-benchmark.json" \
                --baseline "$baseline_file" \
                --threshold 15
            
            local regression_result=$?
            if [ $regression_result -ne 0 ]; then
                log_warning "Performance regressions detected"
                result=$regression_result
            fi
        else
            log_info "No performance baseline found, skipping regression check"
        fi
    fi
    
    return $result
}

run_integration_tests() {
    local output_dir="$1"
    
    log_info "Running integration tests with Playwright..."
    
    cd "$PROJECT_ROOT"
    
    # Install Playwright if not already installed
    if [ ! -d "node_modules/@playwright" ]; then
        log_info "Installing Playwright..."
        npx playwright install --with-deps &>/dev/null
    fi
    
    # Run Playwright E2E tests for hooks
    timeout "$TIMEOUT" npx playwright test tests/hooks/e2e/ \
        --reporter=json \
        --output-dir="$output_dir/playwright" \
        --project=chromium
    
    local result=$?
    
    # Process Playwright results
    if [ -f "$output_dir/playwright/results.json" ]; then
        log_info "Processing Playwright test results..."
        
        local passed_tests
        passed_tests=$(jq '.suites[].specs[] | select(.ok == true) | length' "$output_dir/playwright/results.json" | wc -l)
        local total_tests
        total_tests=$(jq '.suites[].specs | length' "$output_dir/playwright/results.json" | wc -l)
        
        cat > "$output_dir/integration-summary.json" << EOF
{
  "totalTests": $total_tests,
  "passedTests": $passed_tests,
  "failedTests": $((total_tests - passed_tests)),
  "successRate": $(echo "scale=3; $passed_tests / $total_tests" | bc -l)
}
EOF
    fi
    
    return $result
}

run_stress_tests() {
    local output_dir="$1"
    
    log_info "Running stress tests..."
    
    cd "$PROJECT_ROOT"
    
    # Run stress test scenarios
    timeout "$TIMEOUT" node tests/hooks/automation/hook-test-runner.js \
        --output "$output_dir" \
        --timeout $((TIMEOUT - 60)) \
        stress
    
    local result=$?
    
    # Validate stress test results
    if [ $result -eq 0 ] && [ -f "$output_dir/stress-results.json" ]; then
        local stability_score
        stability_score=$(jq -r '.summary.stabilityScore // 0' "$output_dir/stress-results.json")
        if (( $(echo "$stability_score < 0.90" | bc -l) )); then
            log_warning "Stress tests passed but stability score is below 90%: $stability_score"
            result=1
        fi
    fi
    
    return $result
}

# Report generation and analysis
generate_comprehensive_report() {
    log_header "Generating Comprehensive Report"
    
    local report_start_time
    report_start_time=$(date +%s)
    
    # Collect all phase results
    local phases_dir="$REPORT_OUTPUT"
    local report_data="$REPORT_OUTPUT/combined-results.json"
    
    # Create combined report data
    cat > "$report_data" << 'EOF'
{
  "metadata": {
    "timestamp": "",
    "totalDuration": 0,
    "configuration": {}
  },
  "phases": {},
  "summary": {
    "overallSuccess": false,
    "totalTests": 0,
    "passedTests": 0,
    "failedTests": 0,
    "successRate": 0
  },
  "recommendations": []
}
EOF
    
    # Update metadata
    local total_duration=$(($(date +%s) - report_start_time))
    jq --arg timestamp "$(date -Iseconds)" \
       --argjson duration "$total_duration" \
       '.metadata.timestamp = $timestamp | .metadata.totalDuration = $duration' \
       "$report_data" > "$report_data.tmp" && mv "$report_data.tmp" "$report_data"
    
    # Aggregate phase results
    for phase in functional performance integration stress; do
        local phase_dir="$phases_dir/$phase"
        if [ -d "$phase_dir" ]; then
            local phase_metrics="$phase_dir/metrics.json"
            if [ -f "$phase_metrics" ]; then
                local phase_success
                phase_success=$(jq -r '.success' "$phase_metrics")
                jq --arg phase "$phase" \
                   --argjson metrics "$(cat "$phase_metrics")" \
                   '.phases[$phase] = $metrics' \
                   "$report_data" > "$report_data.tmp" && mv "$report_data.tmp" "$report_data"
            fi
        fi
    done
    
    # Calculate overall summary
    local overall_success=true
    local total_tests=0
    local passed_tests=0
    
    # Check each phase success
    for phase in functional performance integration stress; do
        if [ "$phase" = "stress" ] && [ "$SKIP_STRESS" = "true" ]; then
            continue
        fi
        
        local phase_success
        phase_success=$(jq -r ".phases.$phase.success // false" "$report_data")
        if [ "$phase_success" != "true" ]; then
            overall_success=false
        fi
    done
    
    # Update summary
    jq --argjson overall_success "$overall_success" \
       --argjson total_tests "$total_tests" \
       --argjson passed_tests "$passed_tests" \
       '.summary.overallSuccess = $overall_success | 
        .summary.totalTests = $total_tests | 
        .summary.passedTests = $passed_tests | 
        .summary.failedTests = ($total_tests - $passed_tests) | 
        .summary.successRate = (if $total_tests > 0 then $passed_tests / $total_tests else 1 end)' \
       "$report_data" > "$report_data.tmp" && mv "$report_data.tmp" "$report_data"
    
    # Generate HTML report
    generate_html_report "$report_data"
    
    # Generate recommendations
    generate_recommendations "$report_data"
    
    log_success "Comprehensive report generated: $REPORT_OUTPUT/hook-test-report.html"
    
    return 0
}

generate_html_report() {
    local report_data="$1"
    local html_report="$REPORT_OUTPUT/hook-test-report.html"
    
    # Use Node.js to generate HTML report
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$report_data', 'utf8'));
        
        const html = \`
<!DOCTYPE html>
<html lang='en'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Hook Testing Framework Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .status { font-size: 24px; font-weight: bold; color: \${data.summary.overallSuccess ? '#22c55e' : '#ef4444'}; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid #007bff; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .success { color: #22c55e; }
        .failure { color: #ef4444; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🔗 Hook Testing Framework Report</h1>
            <div class='status'>\${data.summary.overallSuccess ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}</div>
            <p>Generated: \${data.metadata.timestamp}</p>
            <p>Duration: \${Math.round(data.metadata.totalDuration / 60)}m</p>
        </div>
        
        <div class='grid'>
            <div class='card'>
                <h3>📊 Overall Results</h3>
                <div class='metric'>
                    <span>Success Rate:</span>
                    <span class='\${data.summary.successRate >= 0.95 ? 'success' : 'failure'}'>\${Math.round(data.summary.successRate * 100)}%</span>
                </div>
            </div>
        </div>
        
        <div style='text-align: center; margin-top: 30px; color: #666;'>
            <p>Hook Testing Framework - Comprehensive Validation Complete</p>
        </div>
    </div>
</body>
</html>
        \`;
        
        fs.writeFileSync('$html_report', html);
    "
}

generate_recommendations() {
    local report_data="$1"
    
    # Generate recommendations based on test results
    local recommendations=()
    
    # Check functional test results
    local functional_success
    functional_success=$(jq -r '.phases.functional.success // false' "$report_data")
    if [ "$functional_success" != "true" ]; then
        recommendations+=("Review hook functional requirements - some validation checks failed")
    fi
    
    # Check performance test results
    local performance_success
    performance_success=$(jq -r '.phases.performance.success // false' "$report_data")
    if [ "$performance_success" != "true" ]; then
        recommendations+=("Optimize hook execution performance - some hooks exceeded time thresholds")
    fi
    
    # Check integration test results
    local integration_success
    integration_success=$(jq -r '.phases.integration.success // false' "$report_data")
    if [ "$integration_success" != "true" ]; then
        recommendations+=("Investigate integration issues - hooks may not be properly coordinating")
    fi
    
    # Check stress test results
    if [ "$SKIP_STRESS" != "true" ]; then
        local stress_success
        stress_success=$(jq -r '.phases.stress.success // false' "$report_data")
        if [ "$stress_success" != "true" ]; then
            recommendations+=("Improve hook resilience under load - stress tests revealed stability issues")
        fi
    fi
    
    # Add recommendations to report
    if [ ${#recommendations[@]} -eq 0 ]; then
        recommendations+=("All tests passed! Hooks are ready for production deployment.")
    fi
    
    # Update report with recommendations
    local recommendations_json
    recommendations_json=$(printf '%s\n' "${recommendations[@]}" | jq -R . | jq -s .)
    jq --argjson recs "$recommendations_json" '.recommendations = $recs' \
       "$report_data" > "$report_data.tmp" && mv "$report_data.tmp" "$report_data"
}

generate_failure_report() {
    local exit_code="$1"
    
    local failure_report="$REPORT_OUTPUT/failure-report.json"
    
    cat > "$failure_report" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "exitCode": $exit_code,
  "errorMessage": "Hook testing failed",
  "troubleshooting": [
    "Check individual phase logs in $REPORT_OUTPUT",
    "Verify test environment prerequisites",
    "Review hook implementation for compliance issues",
    "Check system resources and performance"
  ]
}
EOF
    
    log_error "Failure report generated: $failure_report"
}

# Main execution
main() {
    log_header "Hook Testing Framework - Comprehensive Validation"
    echo "Output Directory: $REPORT_OUTPUT"
    echo "Timeout: ${TIMEOUT}s"
    echo "Parallel Execution: $PARALLEL"
    echo "Skip Stress Tests: $SKIP_STRESS"
    echo "Verbose Mode: $VERBOSE"
    echo ""
    
    local start_time
    start_time=$(date +%s)
    
    # Phase 1: Environment validation
    if ! validate_environment; then
        log_error "Environment validation failed"
        exit 1
    fi
    
    # Phase 2: Start test services
    if ! start_test_services; then
        log_error "Failed to start test services"
        exit 1
    fi
    
    # Phase 3: Execute test phases
    local test_phases=("functional" "performance" "integration")
    if [ "$SKIP_STRESS" != "true" ]; then
        test_phases+=("stress")
    fi
    
    local phase_results=()
    
    if [ "$PARALLEL" = "true" ]; then
        log_info "Running test phases in parallel..."
        
        # Run phases in parallel
        local pids=()
        for phase in "${test_phases[@]}"; do
            case $phase in
                "functional")
                    run_test_phase "$phase" "Functional Hook Validation" &
                    ;;
                "performance")
                    run_test_phase "$phase" "Performance Benchmarks" &
                    ;;
                "integration")
                    run_test_phase "$phase" "Integration Testing" &
                    ;;
                "stress")
                    run_test_phase "$phase" "Stress Testing" &
                    ;;
            esac
            pids+=($!)
        done
        
        # Wait for all phases to complete
        for pid in "${pids[@]}"; do
            if wait "$pid"; then
                phase_results+=(0)
            else
                phase_results+=(1)
            fi
        done
    else
        log_info "Running test phases sequentially..."
        
        # Run phases sequentially
        for phase in "${test_phases[@]}"; do
            case $phase in
                "functional")
                    run_test_phase "$phase" "Functional Hook Validation"
                    ;;
                "performance")
                    run_test_phase "$phase" "Performance Benchmarks"
                    ;;
                "integration")
                    run_test_phase "$phase" "Integration Testing"
                    ;;
                "stress")
                    run_test_phase "$phase" "Stress Testing"
                    ;;
            esac
            phase_results+=($?)
        done
    fi
    
    # Phase 4: Generate comprehensive report
    generate_comprehensive_report
    
    # Phase 5: Analyze results and determine exit status
    local total_failures=0
    for result in "${phase_results[@]}"; do
        if [ "$result" -ne 0 ]; then
            ((total_failures++))
        fi
    done
    
    local end_time
    end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    log_header "Hook Testing Results"
    echo "Total Duration: ${total_duration}s"
    echo "Test Phases: ${#test_phases[@]}"
    echo "Successful Phases: $((${#test_phases[@]} - total_failures))"
    echo "Failed Phases: $total_failures"
    echo ""
    
    # Save final status
    local final_success
    final_success=$([ "$total_failures" -eq 0 ] && echo "PASSED" || echo "FAILED")
    echo "$final_success" > "$REPORT_OUTPUT/test-status.txt"
    
    if [ "$total_failures" -eq 0 ]; then
        log_success "All hook tests passed! Hooks are ready for production use."
        log_info "📄 Comprehensive report: $REPORT_OUTPUT/hook-test-report.html"
        exit 0
    else
        log_error "Some hook tests failed ($total_failures/${#test_phases[@]})."
        log_info "📄 Failure analysis: $REPORT_OUTPUT/hook-test-report.html"
        exit 1
    fi
}

# Execute main function
main "$@"
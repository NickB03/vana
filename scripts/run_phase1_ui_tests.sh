#!/bin/bash
#
# Run Phase 1 UI Tests with Playwright
# Tests Content Creation and Research specialists through the VANA UI
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
PLAYWRIGHT_REPORT_DIR="$PROJECT_ROOT/playwright-report"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_color "$BLUE" "🔍 Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_color "$RED" "❌ Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    # Check if Playwright is installed
    if [ ! -d "$PROJECT_ROOT/node_modules/@playwright/test" ]; then
        print_color "$YELLOW" "⚠️  Playwright not found. Installing..."
        cd "$PROJECT_ROOT"
        npm install -D @playwright/test @playwright/test-reporter
        npx playwright install
    fi
    
    print_color "$GREEN" "✅ Prerequisites satisfied"
}

# Function to ensure VANA is running
ensure_vana_running() {
    print_color "$BLUE" "🔍 Checking if VANA is running..."
    
    # Check if VANA is running on default port
    if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
        print_color "$YELLOW" "⚠️  VANA not running. Starting development server..."
        
        # Start VANA in background
        cd "$PROJECT_ROOT"
        npm run dev &
        VANA_PID=$!
        
        # Wait for server to start
        print_color "$BLUE" "⏳ Waiting for VANA to start..."
        sleep 10
        
        # Verify it started
        if ! curl -s http://localhost:5173 > /dev/null 2>&1; then
            print_color "$RED" "❌ Failed to start VANA"
            kill $VANA_PID 2>/dev/null || true
            exit 1
        fi
        
        print_color "$GREEN" "✅ VANA started successfully"
        return $VANA_PID
    else
        print_color "$GREEN" "✅ VANA is already running"
        return 0
    fi
}

# Function to run tests
run_tests() {
    local test_type=$1
    local browser=$2
    
    print_color "$BLUE" "🎭 Running $test_type tests on $browser..."
    
    cd "$PROJECT_ROOT"
    
    # Create test results directory
    mkdir -p "$TEST_RESULTS_DIR"
    
    # Set test options based on type
    case $test_type in
        "smoke")
            GREP_PATTERN="@smoke|should create a technical report|should conduct comprehensive research"
            ;;
        "full")
            GREP_PATTERN=""
            ;;
        "performance")
            GREP_PATTERN="Performance Tests"
            ;;
        "accessibility")
            GREP_PATTERN="Accessibility"
            ;;
        *)
            GREP_PATTERN=""
            ;;
    esac
    
    # Run Playwright tests
    if [ -n "$GREP_PATTERN" ]; then
        npx playwright test --project="$browser" --grep "$GREP_PATTERN" || true
    else
        npx playwright test --project="$browser" tests/e2e/phase1-specialists.spec.ts || true
    fi
}

# Function to generate report
generate_report() {
    print_color "$BLUE" "📊 Generating test report..."
    
    cd "$PROJECT_ROOT"
    
    # Generate HTML report
    npx playwright show-report || true
    
    # Create summary
    if [ -f "$TEST_RESULTS_DIR/results.json" ]; then
        print_color "$GREEN" "✅ Test report generated at: $PLAYWRIGHT_REPORT_DIR/index.html"
    fi
}

# Main execution
main() {
    print_color "$BLUE" "🚀 VANA Phase 1 UI Test Runner"
    print_color "$BLUE" "================================"
    
    # Parse command line arguments
    TEST_TYPE="${1:-full}"
    BROWSER="${2:-chromium}"
    KEEP_VANA_RUNNING="${3:-false}"
    
    # Check prerequisites
    check_prerequisites
    
    # Ensure VANA is running
    ensure_vana_running
    VANA_PID=$?
    
    # Clean previous results
    rm -rf "$TEST_RESULTS_DIR"
    rm -rf "$PLAYWRIGHT_REPORT_DIR"
    
    # Run tests based on type
    case $TEST_TYPE in
        "smoke")
            print_color "$YELLOW" "🔥 Running smoke tests..."
            run_tests "smoke" "$BROWSER"
            ;;
        "full")
            print_color "$YELLOW" "🧪 Running full test suite..."
            run_tests "full" "$BROWSER"
            ;;
        "all-browsers")
            print_color "$YELLOW" "🌐 Running tests on all browsers..."
            for browser in chromium firefox webkit; do
                run_tests "full" "$browser"
            done
            ;;
        "performance")
            print_color "$YELLOW" "⚡ Running performance tests..."
            run_tests "performance" "$BROWSER"
            ;;
        "accessibility")
            print_color "$YELLOW" "♿ Running accessibility tests..."
            run_tests "accessibility" "$BROWSER"
            ;;
        *)
            print_color "$RED" "❌ Unknown test type: $TEST_TYPE"
            print_color "$YELLOW" "Usage: $0 [smoke|full|all-browsers|performance|accessibility] [browser] [keep-running]"
            exit 1
            ;;
    esac
    
    # Generate report
    generate_report
    
    # Stop VANA if we started it
    if [ "$VANA_PID" -gt 0 ] && [ "$KEEP_VANA_RUNNING" != "true" ]; then
        print_color "$BLUE" "🛑 Stopping VANA server..."
        kill $VANA_PID 2>/dev/null || true
    fi
    
    print_color "$GREEN" "✅ Phase 1 UI tests completed!"
    print_color "$BLUE" "📊 View report: open $PLAYWRIGHT_REPORT_DIR/index.html"
}

# Run main function
main "$@"
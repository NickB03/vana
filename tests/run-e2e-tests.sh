#!/bin/bash

# Comprehensive E2E Test Runner for Vana Project
# This script runs all end-to-end tests with proper setup and reporting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:8000"
REPORTS_DIR=".claude_workspace/reports"
SCREENSHOTS_DIR="$REPORTS_DIR/screenshots"
TEST_RESULTS_DIR="$REPORTS_DIR/test-results"

echo -e "${BLUE}🚀 Starting Vana E2E Test Suite${NC}"
echo "========================================"

# Create report directories
mkdir -p "$SCREENSHOTS_DIR" "$TEST_RESULTS_DIR"

# Function to check if service is running
check_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Checking if $name is running at $url...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name is running${NC}"
            return 0
        fi
        
        echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting for $name...${NC}"
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $name is not running at $url${NC}"
    return 1
}

# Function to run test suite
run_test_suite() {
    local suite_name=$1
    local test_pattern=$2
    
    echo -e "${BLUE}🧪 Running $suite_name tests...${NC}"
    
    # Run Playwright tests with retries and proper reporting
    if npx playwright test "$test_pattern" \
        --reporter=html,json,list \
        --output-dir="$TEST_RESULTS_DIR/$suite_name" \
        --retries=2 \
        --timeout=30000; then
        echo -e "${GREEN}✅ $suite_name tests passed${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name tests failed${NC}"
        return 1
    fi
}

# Function to generate comprehensive report
generate_report() {
    local overall_result=$1
    local report_file="$REPORTS_DIR/e2e-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    echo "# Vana E2E Test Report" > "$report_file"
    echo "Generated: $(date)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "## Test Summary" >> "$report_file"
    if [ $overall_result -eq 0 ]; then
        echo "✅ **Overall Result: PASSED**" >> "$report_file"
    else
        echo "❌ **Overall Result: FAILED**" >> "$report_file"
    fi
    echo "" >> "$report_file"
    
    echo "## Test Suites" >> "$report_file"
    echo "- Authentication Flow Tests" >> "$report_file"
    echo "- SSE Streaming Tests" >> "$report_file"
    echo "- Responsive Design Tests" >> "$report_file"
    echo "- Theme Switching Tests" >> "$report_file"
    echo "- Canvas Functionality Tests" >> "$report_file"
    echo "- API Integration Tests" >> "$report_file"
    echo "- Error Handling & Edge Cases" >> "$report_file"
    echo "" >> "$report_file"
    
    echo "## Screenshots" >> "$report_file"
    if [ -d "$SCREENSHOTS_DIR" ]; then
        find "$SCREENSHOTS_DIR" -name "*.png" -type f | head -20 | while read -r screenshot; do
            echo "- $(basename "$screenshot")" >> "$report_file"
        done
    fi
    echo "" >> "$report_file"
    
    echo "## Environment" >> "$report_file"
    echo "- Frontend URL: $FRONTEND_URL" >> "$report_file"
    echo "- Backend URL: $BACKEND_URL" >> "$report_file"
    echo "- Node Version: $(node --version)" >> "$report_file"
    echo "- Playwright Version: $(npx playwright --version)" >> "$report_file"
    echo "" >> "$report_file"
    
    echo -e "${BLUE}📄 Test report generated: $report_file${NC}"
}

# Main execution
main() {
    local overall_result=0
    
    echo -e "${YELLOW}🔍 Pre-flight checks...${NC}"
    
    # Check if required services are running
    if ! check_service "$BACKEND_URL/health" "Backend"; then
        echo -e "${RED}❌ Backend service is not running. Please start it with: make dev-backend${NC}"
        exit 1
    fi
    
    if ! check_service "$FRONTEND_URL" "Frontend"; then
        echo -e "${RED}❌ Frontend service is not running. Please start it with: make dev-frontend${NC}"
        exit 1
    fi
    
    # Install Playwright browsers if needed
    echo -e "${YELLOW}🌐 Ensuring Playwright browsers are installed...${NC}"
    npx playwright install --with-deps
    
    echo -e "${GREEN}✅ Pre-flight checks completed${NC}"
    echo ""
    
    # Run test suites
    echo -e "${BLUE}🧪 Running E2E Test Suites${NC}"
    echo "========================================"
    
    # Authentication Tests
    if ! run_test_suite "Authentication" "tests/e2e/auth/*.spec.ts"; then
        overall_result=1
    fi
    
    # SSE Streaming Tests
    if ! run_test_suite "SSE-Streaming" "tests/e2e/chat/sse-streaming.spec.ts"; then
        overall_result=1
    fi
    
    # Responsive Design Tests
    if ! run_test_suite "Responsive-Design" "tests/e2e/responsive/responsive-design.spec.ts"; then
        overall_result=1
    fi
    
    # Theme Switching Tests
    if ! run_test_suite "Theme-Switching" "tests/e2e/responsive/theme-switching.spec.ts"; then
        overall_result=1
    fi
    
    # Canvas Functionality Tests
    if ! run_test_suite "Canvas-Functionality" "tests/e2e/canvas/canvas-functionality.spec.ts"; then
        overall_result=1
    fi
    
    # API Integration Tests
    if ! run_test_suite "API-Integration" "tests/integration/api/api-endpoints.spec.ts"; then
        overall_result=1
    fi
    
    # Error Handling Tests
    if ! run_test_suite "Error-Handling" "tests/e2e/error-handling/edge-cases.spec.ts"; then
        overall_result=1
    fi
    
    echo ""
    echo "========================================"
    
    # Generate comprehensive report
    generate_report $overall_result
    
    # Final summary
    if [ $overall_result -eq 0 ]; then
        echo -e "${GREEN}🎉 All E2E tests completed successfully!${NC}"
        echo -e "${GREEN}✅ The application is ready for production${NC}"
    else
        echo -e "${RED}💥 Some E2E tests failed${NC}"
        echo -e "${RED}❌ Please review the test results and fix issues before deployment${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📊 Test artifacts location:${NC}"
    echo "  - Screenshots: $SCREENSHOTS_DIR"
    echo "  - Test results: $TEST_RESULTS_DIR"
    echo "  - HTML report: $REPORTS_DIR/playwright-html/index.html"
    
    exit $overall_result
}

# Handle script interruption
trap 'echo -e "${RED}❌ Test execution interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"
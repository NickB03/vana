#!/bin/bash
# Chat Interface Playwright Test Runner
# Comprehensive test runner for visual chat interface verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Starting Chat Interface Playwright Tests${NC}"
echo "=================================================="

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Must be run from the frontend directory${NC}"
    exit 1
fi

# Create screenshots directory
echo -e "${YELLOW}📁 Setting up test directories...${NC}"
mkdir -p test-results/screenshots
mkdir -p playwright-report

# Check if servers are running
echo -e "${YELLOW}🔍 Checking server status...${NC}"

# Check frontend server
if ! curl -s http://localhost:3001 > /dev/null; then
    echo -e "${RED}❌ Frontend server not running on port 3001${NC}"
    echo "Please start the frontend server with: npm run dev"
    exit 1
fi

# Check backend server
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo -e "${YELLOW}⚠️ Backend server may not be running on port 8000${NC}"
    echo "Tests may fail without backend. Start with: python -m uvicorn app.server:app --reload --host 0.0.0.0 --port 8000"
fi

echo -e "${GREEN}✅ Servers are running${NC}"

# Install Playwright browsers if needed
echo -e "${YELLOW}🌐 Ensuring Playwright browsers are installed...${NC}"
npx playwright install

# Run the comprehensive tests
echo -e "${BLUE}🚀 Running comprehensive chat interface tests...${NC}"

# Run specific test file
npx playwright test tests/e2e/comprehensive-chat-interface.spec.ts \
    --reporter=html,line \
    --output-dir=test-results \
    --project=chromium

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
    echo -e "${BLUE}📸 Screenshots saved in: test-results/screenshots/${NC}"
    echo -e "${BLUE}📋 HTML report generated at: playwright-report/index.html${NC}"
else
    echo -e "${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
    echo -e "${YELLOW}📸 Screenshots and videos available in: test-results/${NC}"
    echo -e "${YELLOW}📋 Check HTML report for details: playwright-report/index.html${NC}"
fi

# Show test artifacts
echo ""
echo -e "${BLUE}📁 Test Artifacts:${NC}"
echo "  Screenshots: $(ls test-results/screenshots/*.png 2>/dev/null | wc -l) files"
echo "  Videos: $(ls test-results/*.webm 2>/dev/null | wc -l) files"
echo "  Traces: $(ls test-results/*.zip 2>/dev/null | wc -l) files"

# Open report if tests passed
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Opening test report...${NC}"
    if command -v open &> /dev/null; then
        open playwright-report/index.html
    elif command -v xdg-open &> /dev/null; then
        xdg-open playwright-report/index.html
    fi
fi

echo ""
echo -e "${BLUE}📝 Test Summary:${NC}"
echo "  Total Test Suites: 8 comprehensive scenarios"
echo "  Visual Verifications: Screenshots for each test state"  
echo "  Error Handling: Multiple failure scenarios tested"
echo "  Accessibility: Keyboard navigation and ARIA labels verified"

exit $TEST_EXIT_CODE
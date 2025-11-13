#!/bin/bash

# Edge Functions Test Runner
# Runs tests, generates coverage, and creates summary report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COVERAGE_THRESHOLD=90
TEST_DIR="supabase/functions/_shared/__tests__"
COVERAGE_DIR="coverage"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Edge Functions Test Suite Runner   ${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Step 1: Clean previous coverage
echo -e "${YELLOW}Cleaning previous coverage data...${NC}"
rm -rf $COVERAGE_DIR
mkdir -p $COVERAGE_DIR

# Step 2: Run tests with coverage
echo -e "${YELLOW}Running tests with coverage...${NC}"
cd supabase/functions

if deno test \
  --allow-env \
  --allow-net \
  --allow-read \
  --coverage=$COVERAGE_DIR \
  --parallel \
  _shared/__tests__/; then
  echo -e "${GREEN}✓ All tests passed${NC}"
else
  echo -e "${RED}✗ Some tests failed${NC}"
  exit 1
fi

echo ""

# Step 3: Generate LCOV report
echo -e "${YELLOW}Generating LCOV report...${NC}"
deno coverage $COVERAGE_DIR --lcov > coverage.lcov
echo -e "${GREEN}✓ LCOV report generated: coverage.lcov${NC}"

echo ""

# Step 4: Generate detailed coverage report
echo -e "${YELLOW}Generating detailed coverage report...${NC}"
DETAILED_OUTPUT=$(deno coverage $COVERAGE_DIR --detailed)
echo "$DETAILED_OUTPUT"

echo ""

# Step 5: Extract and verify coverage percentage
echo -e "${YELLOW}Verifying coverage threshold...${NC}"
TOTAL_LINE=$(echo "$DETAILED_OUTPUT" | grep "^Total")
COVERAGE_PERCENT=$(echo "$TOTAL_LINE" | awk '{print $2}' | sed 's/%//')

if [ -z "$COVERAGE_PERCENT" ]; then
  echo -e "${RED}✗ Could not extract coverage percentage${NC}"
  exit 1
fi

# Convert to integer for comparison
COVERAGE_INT=$(echo "$COVERAGE_PERCENT" | cut -d'.' -f1)

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Coverage Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "Total Coverage: ${GREEN}${COVERAGE_PERCENT}%${NC}"
echo -e "Threshold:      ${YELLOW}${COVERAGE_THRESHOLD}%${NC}"
echo ""

if [ "$COVERAGE_INT" -lt "$COVERAGE_THRESHOLD" ]; then
  echo -e "${RED}✗ Coverage is below ${COVERAGE_THRESHOLD}% threshold (${COVERAGE_PERCENT}%)${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Coverage meets ${COVERAGE_THRESHOLD}% threshold (${COVERAGE_PERCENT}%)${NC}"
fi

echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "${GREEN}✓ All tests passed${NC}"
echo -e "${GREEN}✓ Coverage meets threshold${NC}"
echo -e "${GREEN}✓ Reports generated${NC}"
echo ""

# Step 6: Generate test summary markdown
echo -e "${YELLOW}Generating test summary...${NC}"

cat > test-summary.md <<EOF
# Edge Functions Test Summary

**Generated:** $(date)

## Test Results

✅ All tests passed

## Coverage Report

**Total Coverage:** ${COVERAGE_PERCENT}%
**Threshold:** ${COVERAGE_THRESHOLD}%

### Module Coverage

\`\`\`
$DETAILED_OUTPUT
\`\`\`

## Files

- **LCOV Report:** coverage.lcov
- **Detailed Coverage:** $COVERAGE_DIR/

## Next Steps

1. Review coverage report for untested code paths
2. Add tests for any modules below 90% coverage
3. Run \`deno task test:watch\` during development

EOF

echo -e "${GREEN}✓ Test summary saved: test-summary.md${NC}"

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  All checks passed! 🎉${NC}"
echo -e "${GREEN}======================================${NC}"

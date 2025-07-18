#!/bin/bash

# VANA Kibo UI Migration - Parallel Build Pipeline
# Phase 0 Foundation Validation Script

set -e  # Exit on any error

echo "🚀 VANA Kibo UI Migration - Phase 0 Foundation Validation"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run command and capture output
run_with_output() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${BLUE}Running: ${description}${NC}"
    echo "Command: $cmd"
    
    if eval "$cmd"; then
        echo -e "${GREEN}✅ $description - PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $description - FAILED${NC}"
        return 1
    fi
}

# Validation steps per PRD Phase 0
echo "📋 Phase 0 Foundation Validation Checklist:"
echo ""

# 1. Build validation
run_with_output "npm run build" "Build succeeds"

# 2. Test validation
run_with_output "npm run test:run" "All existing tests pass"

# 3. Linting validation
run_with_output "npm run lint" "Linting passes"

# 4. Migration-specific tests
run_with_output "npm run test:migration" "Migration compatibility tests pass"

# 5. Brand validation (placeholder)
echo -e "${BLUE}Running: VANA brand validation${NC}"
echo "Command: npm run brand:validate"
if npm run brand:validate; then
    echo -e "${GREEN}✅ VANA brand validation - PASSED${NC}"
else
    echo -e "${RED}❌ VANA brand validation - FAILED${NC}"
    exit 1
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Phase 0 Foundation Validation COMPLETE${NC}"
echo ""
echo "✅ All foundation validation checks passed"
echo "✅ Ready for Kibo UI component integration"
echo "✅ VANA brand preservation validated"
echo ""
echo "Next steps:"
echo "  1. Begin Phase 1: Core Infrastructure"
echo "  2. Install first Kibo UI components"
echo "  3. Integrate VANA brand theming"
echo ""
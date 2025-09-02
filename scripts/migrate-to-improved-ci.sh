#!/bin/bash

# Migration script for improved CI/CD pipeline
set -e

echo "🚀 CI/CD Pipeline Migration Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f ".github/workflows/ci.yml" ]; then
    echo -e "${RED}❌ Error: Not in project root or ci.yml not found${NC}"
    exit 1
fi

echo "📋 Current CI Status:"
echo "--------------------"
if [ -f ".github/workflows/ci-improved.yml" ]; then
    echo -e "${GREEN}✅ Improved CI workflow found${NC}"
else
    echo -e "${RED}❌ Improved CI workflow not found${NC}"
    exit 1
fi

# Backup current CI
echo ""
echo "📦 Creating backup..."
cp .github/workflows/ci.yml .github/workflows/ci.yml.backup-$(date +%Y%m%d-%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

# Replace CI with improved version
echo ""
echo "🔄 Switching to improved CI..."
mv .github/workflows/ci-improved.yml .github/workflows/ci.yml
echo -e "${GREEN}✅ CI workflow replaced${NC}"

# Show the changes
echo ""
echo "📊 Summary of Changes:"
echo "---------------------"
echo "• Added automatic repository structure detection"
echo "• Improved error handling with auto-fix attempts"
echo "• Better conditional job execution"
echo "• Clearer error reporting"
echo "• Maintained simplicity (still ~270 lines vs 1400+)"

echo ""
echo -e "${GREEN}✨ Migration Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Commit the changes: git add . && git commit -m 'feat: switch to improved CI with auto-detection'"
echo "2. Push to PR branch: git push origin simplify-ci-pipeline"
echo "3. Monitor CI results"
echo ""
echo "To rollback if needed:"
echo "  cp .github/workflows/ci.yml.backup-* .github/workflows/ci.yml"
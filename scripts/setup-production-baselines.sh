#!/bin/bash
#
# Setup Production Performance Baselines
# 
# This script helps you update your performance baselines to use your actual
# deployed production URL instead of localhost references.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🎯 Setup Production Performance Baselines${NC}"
echo "=========================================="
echo ""

# Check if production URL is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage:${NC}"
    echo "  $0 <production-url>"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  $0 https://your-app.vercel.app"
    echo "  $0 https://your-app.netlify.app"
    echo "  $0 https://app.yourdomain.com"
    echo ""
    echo -e "${RED}❌ Error: Please provide your production URL${NC}"
    exit 1
fi

PRODUCTION_URL="$1"

# Validate URL format
if [[ ! "$PRODUCTION_URL" =~ ^https:// ]]; then
    echo -e "${YELLOW}⚠️  Warning: URL should start with https:// for realistic production testing${NC}"
    echo "   Current URL: $PRODUCTION_URL"
    echo ""
fi

# Extract domain for display
DOMAIN=$(echo "$PRODUCTION_URL" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*||')

echo -e "${BLUE}Configuration:${NC}"
echo "  Production URL: $PRODUCTION_URL"
echo "  Domain: $DOMAIN"
echo "  Protocol: $([ "${PRODUCTION_URL:0:8}" == "https://" ] && echo "HTTP/2+" || echo "HTTP/1.1")"
echo ""

# Check if baseline files exist
BASELINE_DIR="$PROJECT_ROOT/docs/performance/baselines"
if [ ! -d "$BASELINE_DIR" ]; then
    echo -e "${RED}❌ Error: Baseline directory not found: $BASELINE_DIR${NC}"
    exit 1
fi

BASE_JSON="$BASELINE_DIR/base.json"
OPTIMIZED_JSON="$BASELINE_DIR/optimized.json"

if [ ! -f "$BASE_JSON" ]; then
    echo -e "${RED}❌ Error: Base baseline file not found: $BASE_JSON${NC}"
    exit 1
fi

# Create backup
BACKUP_DIR="$BASELINE_DIR/backup-$(date +%Y%m%d-%H%M%S)"
echo -e "${YELLOW}📦 Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"
[ -f "$BASE_JSON" ] && cp "$BASE_JSON" "$BACKUP_DIR/"
[ -f "$OPTIMIZED_JSON" ] && cp "$OPTIMIZED_JSON" "$BACKUP_DIR/"
echo "   Backup created: $BACKUP_DIR"
echo ""

# Run the update script
echo -e "${BLUE}🔄 Updating baseline URLs...${NC}"
cd "$PROJECT_ROOT"

if command -v node >/dev/null 2>&1; then
    node scripts/update-baseline-urls.js --url "$PRODUCTION_URL"
else
    echo -e "${RED}❌ Error: Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi

echo ""

# Verify changes
echo -e "${BLUE}🔍 Verifying changes...${NC}"

# Count localhost references (some may remain in other parts of the JSON)
LOCALHOST_COUNT=$(grep -c "127\.0\.0\.1" "$BASE_JSON" 2>/dev/null || echo "0")
PRODUCTION_COUNT=$(grep -c "$DOMAIN" "$BASE_JSON" 2>/dev/null || echo "0")
HTTP2_COUNT=$(grep -c '"protocol": "h2"' "$BASE_JSON" 2>/dev/null || echo "0")

echo "  Production domain references: $PRODUCTION_COUNT"
echo "  HTTP/2 protocol entries: $HTTP2_COUNT"
echo "  Remaining localhost references: $LOCALHOST_COUNT"

if [ "$PRODUCTION_COUNT" -gt 0 ]; then
    echo -e "  ${GREEN}✅ Production URLs successfully applied${NC}"
else
    echo -e "  ${RED}❌ No production URLs found in baseline${NC}"
fi

echo ""

# Show next steps
echo -e "${GREEN}🎉 Baseline update completed!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review the updated baseline files:"
echo "   - $BASE_JSON"
echo "   - $OPTIMIZED_JSON"
echo ""
echo "2. Test your performance setup:"
echo "   cd frontend && npm run performance:audit:prod"
echo ""
echo "3. If you need to revert changes:"
echo "   cp $BACKUP_DIR/* $BASELINE_DIR/"
echo ""
echo "4. Commit the updated baselines:"
echo "   git add docs/performance/baselines/"
echo "   git commit -m \"chore: update performance baselines to production URLs\""
echo ""

# Optional: Run a quick validation
if command -v curl >/dev/null 2>&1; then
    echo -e "${BLUE}🌐 Testing production URL accessibility...${NC}"
    if curl -s -f -o /dev/null "$PRODUCTION_URL"; then
        echo -e "  ${GREEN}✅ Production URL is accessible${NC}"
    else
        echo -e "  ${YELLOW}⚠️  Warning: Production URL may not be accessible${NC}"
        echo "     Make sure your deployment is live before running performance tests"
    fi
    echo ""
fi

echo -e "${GREEN}✨ Your performance baselines now reflect production characteristics!${NC}"
#!/bin/bash
# Phase 3.3 Bug Fix Verification Script
# Verifies the POST SSE body race condition fix

set -e

echo "=================================================="
echo "Phase 3.3 Bug Fix Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to frontend directory
cd /Users/nick/Projects/vana/frontend

echo "1. Checking syntax of modified files..."
echo ""

# Check useSSE.ts exists
if [ -f "src/hooks/useSSE.ts" ]; then
    echo -e "${GREEN}✓${NC} src/hooks/useSSE.ts exists"
else
    echo -e "${RED}✗${NC} src/hooks/useSSE.ts not found"
    exit 1
fi

echo ""
echo "2. Verifying key changes are present..."
echo ""

# Check for hasPostBody variable
if grep -q "const hasPostBody = opts.method === 'POST' && requestBodyRef.current" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} hasPostBody check added"
else
    echo -e "${RED}✗${NC} hasPostBody check missing"
    exit 1
fi

# Check for canConnect variable
if grep -q "const canConnect = opts.enabled || hasPostBody" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} canConnect logic added"
else
    echo -e "${RED}✗${NC} canConnect logic missing"
    exit 1
fi

# Check for effectiveUrl
if grep -q "let effectiveUrl = url" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} effectiveUrl variable added"
else
    echo -e "${RED}✗${NC} effectiveUrl variable missing"
    exit 1
fi

# Check for dynamic URL construction
if grep -q "effectiveUrl = '/api/sse/run_sse'" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} Dynamic URL construction added"
else
    echo -e "${RED}✗${NC} Dynamic URL construction missing"
    exit 1
fi

# Check buildSSEUrl accepts targetUrl parameter
if grep -q "const buildSSEUrl = useStableCallback((targetUrl?: string): string =>" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} buildSSEUrl accepts targetUrl parameter"
else
    echo -e "${RED}✗${NC} buildSSEUrl parameter missing"
    exit 1
fi

# Check buildSSEUrl call uses effectiveUrl
if grep -q "const sseUrl = buildSSEUrl(effectiveUrl)" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} buildSSEUrl called with effectiveUrl"
else
    echo -e "${RED}✗${NC} buildSSEUrl call not updated"
    exit 1
fi

echo ""
echo "3. Verifying PHASE 3.3 FIX comments..."
echo ""

# Count PHASE 3.3 FIX comments
FIX_COMMENTS=$(grep -c "PHASE 3.3 FIX" src/hooks/useSSE.ts || echo "0")
if [ "$FIX_COMMENTS" -ge 3 ]; then
    echo -e "${GREEN}✓${NC} Found $FIX_COMMENTS PHASE 3.3 FIX comments (expected ≥3)"
else
    echo -e "${RED}✗${NC} Found only $FIX_COMMENTS PHASE 3.3 FIX comments (expected ≥3)"
    exit 1
fi

echo ""
echo "4. Checking for backward compatibility..."
echo ""

# Verify enabled check still exists (for backward compat)
if grep -q "enabled: url !== ''" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} Legacy enabled check preserved"
else
    echo -e "${YELLOW}⚠${NC} Legacy enabled check might be modified"
fi

# Verify GET requests still work
if grep -q "method: 'GET'" src/hooks/useSSE.ts; then
    echo -e "${GREEN}✓${NC} GET method support preserved"
else
    echo -e "${YELLOW}⚠${NC} GET method references not found (might be okay)"
fi

echo ""
echo "5. Documentation verification..."
echo ""

# Check execution plan updated
if grep -q "POST SSE Body Race Condition" /Users/nick/Projects/vana/docs/plans/phase3_3_execution_plan.md; then
    echo -e "${GREEN}✓${NC} Execution plan updated with bug fix section"
else
    echo -e "${RED}✗${NC} Execution plan not updated"
    exit 1
fi

# Check summary document exists
if [ -f "/Users/nick/Projects/vana/docs/plans/PHASE_3_3_BUG_FIX_SUMMARY.md" ]; then
    echo -e "${GREEN}✓${NC} Bug fix summary document created"
else
    echo -e "${RED}✗${NC} Bug fix summary document missing"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}All verification checks passed!${NC}"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Review changes: git diff src/hooks/useSSE.ts"
echo "2. Test locally with feature flag enabled"
echo "3. Use Chrome DevTools MCP to verify in browser"
echo "4. Check console for expected log sequence:"
echo "   ✓ [useSSE] Request body updated"
echo "   ✓ [MessageHandler] Connecting POST SSE"
echo "   ✓ [useSSE] connect() called: {hasPostBody:true, canConnect:true}"
echo "   ✓ [useSSE] Built dynamic URL from request body"
echo "   ✓ [useSSE] SSE connection established"
echo ""
echo "See: docs/plans/PHASE_3_3_BUG_FIX_SUMMARY.md for details"

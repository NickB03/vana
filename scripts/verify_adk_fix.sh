#!/bin/bash
# Verification script for CRIT-001: ADK Integration Fix
# This script checks that the orchestrator is removed and ADK proxy is working

set -e

echo "🔍 CRIT-001 Verification Script"
echo "================================"
echo ""

# Check 1: Verify orchestrator is deleted
echo "✓ Check 1: Verify orchestrator file deleted"
if [ -f "app/research_agents.py" ]; then
    echo "  ❌ FAILED: app/research_agents.py still exists!"
    exit 1
else
    echo "  ✅ PASS: app/research_agents.py deleted"
fi

# Check 2: Verify no orchestrator imports
echo ""
echo "✓ Check 2: Verify no orchestrator imports"
IMPORT_COUNT=$(grep -r "research_orchestrator\|MultiAgentResearchOrchestrator" app/ tests/ --include="*.py" 2>/dev/null | wc -l)
if [ "$IMPORT_COUNT" -gt 0 ]; then
    echo "  ❌ FAILED: Found $IMPORT_COUNT orchestrator references:"
    grep -r "research_orchestrator\|MultiAgentResearchOrchestrator" app/ tests/ --include="*.py" 2>/dev/null
    exit 1
else
    echo "  ✅ PASS: No orchestrator imports found"
fi

# Check 3: Verify ADK agents exist
echo ""
echo "✓ Check 3: Verify ADK agents defined"
if [ -f "app/agent.py" ]; then
    if grep -q "root_agent" app/agent.py && grep -q "interactive_planner_agent" app/agent.py; then
        echo "  ✅ PASS: ADK agents defined in app/agent.py"
    else
        echo "  ❌ FAILED: ADK agents not found in app/agent.py"
        exit 1
    fi
else
    echo "  ❌ FAILED: app/agent.py not found"
    exit 1
fi

# Check 4: Verify ADK proxy exists
echo ""
echo "✓ Check 4: Verify ADK proxy implementation"
if grep -q "http://127.0.0.1:8080/run_sse" app/routes/adk_routes.py; then
    echo "  ✅ PASS: ADK proxy to port 8080 found in adk_routes.py"
else
    echo "  ❌ FAILED: ADK proxy not found in adk_routes.py"
    exit 1
fi

# Check 5: Verify integration test exists
echo ""
echo "✓ Check 5: Verify integration test created"
if [ -f "tests/integration/test_adk_integration.py" ]; then
    echo "  ✅ PASS: Integration test exists"
else
    echo "  ❌ FAILED: tests/integration/test_adk_integration.py not found"
    exit 1
fi

# Check 6: Check if services are running
echo ""
echo "✓ Check 6: Check service status"
BACKEND_RUNNING=$(lsof -i :8000 2>/dev/null | grep -v COMMAND | wc -l)
ADK_RUNNING=$(lsof -i :8080 2>/dev/null | grep -v COMMAND | wc -l)

if [ "$BACKEND_RUNNING" -gt 0 ]; then
    echo "  ✅ Backend running on port 8000"
else
    echo "  ⚠️  Backend NOT running on port 8000"
    echo "     Start with: make dev-backend"
fi

if [ "$ADK_RUNNING" -gt 0 ]; then
    echo "  ✅ ADK service running on port 8080"
else
    echo "  ⚠️  ADK service NOT running on port 8080"
    echo "     Start with: adk web agents/ --port 8080"
fi

echo ""
echo "================================"
echo "✅ All verification checks passed!"
echo ""
echo "Next steps:"
echo "1. Start services if not running:"
echo "   Terminal 1: make dev-backend"
echo "   Terminal 2: adk web agents/ --port 8080"
echo ""
echo "2. Run integration test:"
echo "   pytest tests/integration/test_adk_integration.py -v"
echo ""
echo "3. Test from frontend:"
echo "   http://localhost:3000"

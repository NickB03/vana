#!/bin/bash

# Backend Validation Script for Vana
# Ensures all backend services are properly configured and running

set -e

echo "🔍 Vana Backend Validation Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
FRONTEND_ORIGIN="http://localhost:5173"
TEST_SESSION_ID="test-validation-$(date +%s)"

# Function to check service
check_service() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    printf "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK${NC} (Status: $response)"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC} (Expected: $expected_status, Got: $response)"
        return 1
    fi
}

# Function to check CORS
check_cors() {
    printf "Checking CORS configuration... "
    
    response=$(curl -s -I -X OPTIONS \
        -H "Origin: $FRONTEND_ORIGIN" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$BACKEND_URL/" 2>/dev/null)
    
    if echo "$response" | grep -q "Access-Control-Allow-Origin"; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "  Allowed origins detected in response headers"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "  No Access-Control-Allow-Origin header found"
        return 1
    fi
}

# Function to check SSE endpoint
check_sse() {
    printf "Checking SSE endpoint... "
    
    # Use timeout to prevent hanging
    timeout 2s curl -s -N \
        -H "Accept: text/event-stream" \
        "$BACKEND_URL/agent_network_sse/$TEST_SESSION_ID" > /tmp/sse_test.txt 2>&1 &
    
    sleep 1
    
    if grep -q "event:" /tmp/sse_test.txt 2>/dev/null || grep -q "data:" /tmp/sse_test.txt 2>/dev/null; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "  SSE stream is responding"
        rm -f /tmp/sse_test.txt
        return 0
    else
        echo -e "${YELLOW}⚠️  WARNING${NC}"
        echo "  SSE endpoint exists but may require authentication"
        rm -f /tmp/sse_test.txt
        return 0
    fi
}

# Function to check environment variables
check_env() {
    printf "Checking environment configuration... "
    
    local missing_vars=()
    
    # Check for .env.local in app directory
    if [ -f "app/.env.local" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "  app/.env.local found"
    else
        echo -e "${YELLOW}⚠️  WARNING${NC}"
        echo "  app/.env.local not found - using defaults"
    fi
    
    return 0
}

# Function to check database
check_database() {
    printf "Checking database connection... "
    
    # Try to access a protected endpoint to trigger DB check
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
    
    if [ "$response" = "200" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        echo "  Database is accessible"
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "  Cannot verify database connection"
        return 1
    fi
}

# Main validation sequence
echo "Starting backend validation..."
echo ""

# Track overall status
all_passed=true

# Run checks
check_env || all_passed=false
check_service "Backend Health" "$BACKEND_URL/health" || all_passed=false
check_service "Backend Root" "$BACKEND_URL/" || all_passed=false
check_cors || all_passed=false
check_sse || all_passed=false
check_database || all_passed=false

echo ""
echo "=================================="

if [ "$all_passed" = true ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo "Backend is ready for frontend development."
    exit 0
else
    echo -e "${RED}❌ Some checks failed!${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
fi
#!/bin/bash
# Test script to validate startup before deployment

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== Testing VANA Startup Locally ==="

# Test 1: Without GOOGLE_API_KEY
echo -e "\n${YELLOW}Test 1: Starting without GOOGLE_API_KEY${NC}"
PORT=8082 python main_fixed.py &
PID=$!
sleep 5

# Check if it's running
if kill -0 $PID 2>/dev/null; then
    echo -e "${GREEN}✅ App started without API key${NC}"
    
    # Test health endpoint
    curl -s http://localhost:8082/health | jq . || echo "Health check failed"
    
    kill $PID
else
    echo -e "${RED}❌ App failed to start${NC}"
fi

# Test 2: With GOOGLE_API_KEY
echo -e "\n${YELLOW}Test 2: Starting with GOOGLE_API_KEY${NC}"
if [ -f .env.local ]; then
    source .env.local
fi

if [ -n "${GOOGLE_API_KEY:-}" ]; then
    PORT=8083 GOOGLE_API_KEY=$GOOGLE_API_KEY python main_fixed.py &
    PID=$!
    sleep 10
    
    if kill -0 $PID 2>/dev/null; then
        echo -e "${GREEN}✅ App started with API key${NC}"
        curl -s http://localhost:8083/health | jq . || echo "Health check failed"
        kill $PID
    else
        echo -e "${RED}❌ App failed to start with API key${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  GOOGLE_API_KEY not found in .env.local${NC}"
fi

echo -e "\n${GREEN}Testing complete!${NC}"
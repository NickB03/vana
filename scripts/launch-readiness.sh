#!/bin/bash

echo "🚀 VANA Launch Readiness Check"
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILED=0

# Run environment validation
echo "1️⃣ Checking Environment Variables..."
if ./scripts/validate-env.sh > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Environment variables configured${NC}"
else
    echo -e "${RED}❌ Environment validation failed${NC}"
    FAILED=$((FAILED + 1))
fi

# Run Python validation
echo -e "\n2️⃣ Validating Python Code..."
if python scripts/validate_production_ready.py > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Python validation passed${NC}"
else
    echo -e "${RED}❌ Python validation failed${NC}"
    echo "   Run: python scripts/validate_production_ready.py"
    FAILED=$((FAILED + 1))
fi

# Check Docker
echo -e "\n3️⃣ Checking Docker..."
if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Docker is running${NC}"
    
    # Check if we can build
    if [ -f "Dockerfile" ] || [ -f "Dockerfile.prod" ]; then
        echo -e "${GREEN}✅ Dockerfile found${NC}"
    else
        echo -e "${YELLOW}⚠️  No Dockerfile found${NC}"
    fi
else
    echo -e "${RED}❌ Docker not running${NC}"
    FAILED=$((FAILED + 1))
fi

# Check UI
echo -e "\n4️⃣ Checking UI Setup..."
if [ -d "vana-ui/node_modules" ]; then
    echo -e "${GREEN}✅ UI dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  UI dependencies not installed${NC}"
    echo "   Run: cd vana-ui && npm install"
fi

# Check for critical files
echo -e "\n5️⃣ Checking Critical Files..."
CRITICAL_FILES=(
    "main.py"
    "main_agentic.py"
    "agents/vana/team.py"
    "vana-ui/src/pages/Chat.tsx"
    "vana-ui/src/pages/Login.tsx"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ Found: $file${NC}"
    else
        echo -e "${RED}❌ Missing: $file${NC}"
        FAILED=$((FAILED + 1))
    fi
done

# Summary
echo -e "\n=============================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All validations passed!${NC}"
    echo -e "\nReady to deploy with:"
    echo "  1. Build: docker build -t vana-prod -f Dockerfile.prod ."
    echo "  2. Run: docker run -p 8080:8080 --env-file .env vana-prod"
    echo "  3. Access at: http://localhost:8080"
else
    echo -e "${RED}❌ $FAILED validations failed${NC}"
    echo -e "\nPlease fix the issues above before deploying."
    exit 1
fi
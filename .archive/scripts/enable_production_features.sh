#!/bin/bash
#
# Enable Production Features for VANA
# This script configures VANA for production deployment
#

set -e

echo "🚀 VANA Production Feature Enablement"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the VANA directory
if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ Error: This script must be run from the VANA root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Current Configuration:${NC}"
echo ""

# Check current ADK events status
if [ -f ".env.local" ]; then
    current_adk=$(grep "USE_ADK_EVENTS" .env.local 2>/dev/null || echo "Not set")
    echo "Local config (.env.local): $current_adk"
fi

if [ -f ".env" ]; then
    current_adk_env=$(grep "USE_ADK_EVENTS" .env 2>/dev/null || echo "Not set")
    echo "Environment config (.env): $current_adk_env"
fi

echo ""
echo -e "${YELLOW}🔧 Enabling Production Features...${NC}"
echo ""

# Create or update .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating .env from .env.example...${NC}"
    cp .env.example .env
fi

# Enable ADK events
echo -e "${GREEN}✅ Enabling ADK Event Streaming${NC}"
if grep -q "USE_ADK_EVENTS" .env; then
    sed -i.bak 's/USE_ADK_EVENTS=.*/USE_ADK_EVENTS=true/' .env
else
    echo "USE_ADK_EVENTS=true" >> .env
fi

# Set production model
echo -e "${GREEN}✅ Setting production model${NC}"
if grep -q "VANA_MODEL" .env; then
    sed -i.bak 's/VANA_MODEL=.*/VANA_MODEL=gemini-2.0-flash/' .env
else
    echo "VANA_MODEL=gemini-2.0-flash" >> .env
fi

# Enable specialists
echo -e "${GREEN}✅ Enabling specialist agents${NC}"
if grep -q "VANA_ENABLE_SPECIALISTS" .env; then
    sed -i.bak 's/VANA_ENABLE_SPECIALISTS=.*/VANA_ENABLE_SPECIALISTS=true/' .env
else
    echo "VANA_ENABLE_SPECIALISTS=true" >> .env
fi

# Clean up backup files
rm -f .env.bak

echo ""
echo -e "${BLUE}📊 Production Configuration Summary:${NC}"
echo "- ADK Event Streaming: ${GREEN}ENABLED${NC}"
echo "- Silent Agent Handoffs: ${GREEN}ACTIVE${NC}"
echo "- Model: ${GREEN}gemini-2.0-flash${NC}"
echo "- Specialists: ${GREEN}ENABLED${NC}"

echo ""
echo -e "${YELLOW}⚠️  Important Reminders:${NC}"
echo "1. Set your GOOGLE_API_KEY in .env"
echo "2. Configure CORS origins in main.py for your domain"
echo "3. Use secret management for API keys in production"
echo "4. Enable monitoring and logging"

echo ""
echo -e "${GREEN}✨ Production features enabled!${NC}"
echo ""
echo "Next steps:"
echo "1. Build Docker image: docker build -t vana:prod ."
echo "2. Test locally: docker run -p 8081:8081 --env-file .env vana:prod"
echo "3. Deploy to your platform (Cloud Run, K8s, etc.)"
echo ""
echo -e "${BLUE}📚 See PRODUCTION_DEPLOYMENT_GUIDE.md for detailed instructions${NC}"
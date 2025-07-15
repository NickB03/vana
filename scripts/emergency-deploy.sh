#!/bin/bash
# Emergency deployment script with proper environment setup

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "=== Emergency VANA Deployment ==="

# 1. Load environment variables
if [ -f .env.local ]; then
    echo -e "${GREEN}✅ Loading .env.local${NC}"
    source .env.local
else
    echo -e "${RED}❌ .env.local not found!${NC}"
    exit 1
fi

# 2. Verify GOOGLE_API_KEY
if [ -z "${GOOGLE_API_KEY:-}" ]; then
    echo -e "${RED}❌ GOOGLE_API_KEY not set!${NC}"
    echo "Add to .env.local: GOOGLE_API_KEY=your-key-here"
    exit 1
fi
echo -e "${GREEN}✅ GOOGLE_API_KEY found${NC}"

# 3. Use fixed main.py temporarily
if [ -f main_fixed.py ]; then
    echo -e "${YELLOW}Using main_fixed.py for deployment${NC}"
    cp main.py main_backup.py
    cp main_fixed.py main.py
fi

# 4. Build frontend
echo -e "${GREEN}Building frontend...${NC}"
(cd vana-ui && npm run build)

# 5. Deploy with explicit env vars
echo -e "${GREEN}Deploying to vana-staging...${NC}"
gcloud run deploy vana-staging \
    --source . \
    --region=us-central1 \
    --allow-unauthenticated \
    --set-env-vars="GOOGLE_API_KEY=${GOOGLE_API_KEY},USE_OFFICIAL_AGENT_TOOL=true,USE_ADK_COORDINATION=true,USE_ADK_EVENTS=true" \
    --port=8081 \
    --memory=2Gi \
    --cpu=2 \
    --timeout=900 \
    --max-instances=10 \
    --min-instances=1

# 6. Restore original main.py
if [ -f main_backup.py ]; then
    mv main_backup.py main.py
fi

echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo "Check status at: https://console.cloud.google.com/run?project=analystai-454200"
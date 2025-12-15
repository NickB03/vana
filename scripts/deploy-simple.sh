#!/bin/bash
# Simple deployment script for production
# Usage: ./scripts/deploy-simple.sh prod

set -e
trap 'echo -e "${NC}"' EXIT ERR  # Reset terminal color on exit/error

ENV=$1

# Configuration
PROD_REF="${SUPABASE_PRODUCTION_REF:-vznhbocnuykdmjvujaka}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Validate environment
if [ "$ENV" != "prod" ]; then
  echo "Usage: ./scripts/deploy-simple.sh prod"
  echo ""
  echo "This script deploys Edge Functions to production (vana-dev)."
  echo "For local development, use: supabase start"
  exit 1
fi

PROJECT_REF=$PROD_REF
echo -e "${RED}⚠️⚠️⚠️  DEPLOYING TO PRODUCTION  ⚠️⚠️⚠️${NC}"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Last commit: $(git log -1 --oneline)"
echo "Project ref: $PROD_REF"
echo ""
read -p "Type the production project ref to confirm: " confirm
if [ "$confirm" != "$PROD_REF" ]; then
  echo "Deployment cancelled (incorrect project ref)"
  exit 1
fi

# Create backup before production deploy
echo ""
if [ -f scripts/backup-db.sh ]; then
  ./scripts/backup-db.sh production
else
  echo -e "${YELLOW}⚠️  No backup script found (skipping backup)${NC}"
fi

# Run tests (optional - comment out if you want faster deploys)
echo -e "${YELLOW}🧪 Running tests...${NC}"
if npm run test; then
  echo -e "${GREEN}✅ Tests passed${NC}"
else
  echo -e "${RED}❌ Tests failed${NC}"
  read -p "Deploy anyway? (yes/no): " confirm
  if [ "$confirm" != "yes" ]; then
    exit 1
  fi
fi

# Deploy Edge Functions with timeout
echo -e "${YELLOW}🔧 Deploying Edge Functions...${NC}"
if timeout 300 supabase functions deploy --project-ref "$PROJECT_REF"; then
  echo -e "${GREEN}✅ Functions deployed${NC}"
else
  echo -e "${RED}❌ Deployment failed or timed out (5 min limit)${NC}"
  exit 1
fi

# Success
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✅ Deployment to production complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor production"
echo "  2. Check logs: supabase functions logs --project-ref $PROJECT_REF"
echo ""

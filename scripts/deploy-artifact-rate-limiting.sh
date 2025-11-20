#!/bin/bash

# Deployment Script: Artifact Rate Limiting Security Fix
# Date: 2025-11-19
# Priority: HIGH - Critical Security Fix

set -e  # Exit on error

echo "=================================================="
echo "Deploying Artifact Rate Limiting Security Fix"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}ERROR: Supabase CLI not found${NC}"
    echo "Please install: npm install -g supabase"
    exit 1
fi

echo -e "${YELLOW}Step 1: Deploying generate-artifact function...${NC}"
supabase functions deploy generate-artifact

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ generate-artifact deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy generate-artifact${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 2: Deploying generate-artifact-fix function...${NC}"
supabase functions deploy generate-artifact-fix

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ generate-artifact-fix deployed successfully${NC}"
else
    echo -e "${RED}✗ Failed to deploy generate-artifact-fix${NC}"
    exit 1
fi

echo ""
echo "=================================================="
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "Rate Limiting Now Active:"
echo "  • API Throttle: 10 requests/minute (all users)"
echo "  • Guest Users: 5 requests per 5 hours"
echo "  • Authenticated: 50 requests per 5 hours"
echo ""
echo "Next Steps:"
echo "  1. Monitor logs: supabase functions logs generate-artifact --tail"
echo "  2. Test guest limit: Make 6 requests without auth"
echo "  3. Test user limit: Make 51 requests with auth"
echo "  4. Verify 429 responses with proper headers"
echo ""
echo "Documentation:"
echo "  • Audit Report: .claude/ARTIFACT_RATE_LIMITING_AUDIT.md"
echo "  • Implementation: .claude/ARTIFACT_RATE_LIMITING_IMPLEMENTATION.md"
echo ""

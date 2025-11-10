#!/bin/bash
#############################################################################
# Supabase Secret Migration Script
# Automates renaming of API keys for round-robin rotation
#############################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Supabase Secret Migration ===${NC}"
echo ""

# Check if all required values are provided as arguments
if [ $# -lt 6 ]; then
    echo -e "${RED}Error: Missing secret values${NC}"
    echo ""
    echo "Usage: $0 <GOOGLE_KEY_1> <GOOGLE_KEY_2> <GOOGLE_KEY_3> <GOOGLE_KEY_4> <GOOGLE_KEY_5> <GOOGLE_KEY_6>"
    echo ""
    echo "Example:"
    echo "  $0 AIzaSy...key1 AIzaSy...key2 AIzaSy...key3 AIzaSy...key4 AIzaSy...key5 AIzaSy...key6"
    echo ""
    echo "How to get secret values:"
    echo "  1. Go to: https://supabase.com/dashboard/project/uznhbocnuykdmjvujaka/settings/functions"
    echo "  2. Click 'Secrets' tab"
    echo "  3. Copy each GOOGLE_KEY_* value"
    echo "  4. Run this script with the values as arguments"
    echo ""
    exit 1
fi

# Get secret values from arguments
GOOGLE_KEY_1="$1"
GOOGLE_KEY_2="$2"
GOOGLE_KEY_3="$3"
GOOGLE_KEY_4="$4"
GOOGLE_KEY_5="$5"
GOOGLE_KEY_6="$6"

# Validate that keys look like API keys (start with AIza)
validate_key() {
    if [[ ! $1 =~ ^AIza ]]; then
        echo -e "${RED}Error: Invalid key format: $1${NC}"
        echo "Expected: AIza... (Google AI Studio key format)"
        exit 1
    fi
}

echo "Validating secret values..."
validate_key "$GOOGLE_KEY_1"
validate_key "$GOOGLE_KEY_2"
validate_key "$GOOGLE_KEY_3"
validate_key "$GOOGLE_KEY_4"
validate_key "$GOOGLE_KEY_5"
validate_key "$GOOGLE_KEY_6"
echo -e "${GREEN}✓ All keys have valid format${NC}"
echo ""

# Map old keys to new names
declare -A SECRET_MAPPING
SECRET_MAPPING["GOOGLE_KEY_1"]="GOOGLE_AI_STUDIO_KEY_CHAT_1"
SECRET_MAPPING["GOOGLE_KEY_2"]="GOOGLE_AI_STUDIO_KEY_CHAT_2"
SECRET_MAPPING["GOOGLE_KEY_3"]="GOOGLE_AI_STUDIO_KEY_IMAGE_1"
SECRET_MAPPING["GOOGLE_KEY_4"]="GOOGLE_AI_STUDIO_KEY_IMAGE_2"
SECRET_MAPPING["GOOGLE_KEY_5"]="GOOGLE_AI_STUDIO_KEY_FIX_1"
SECRET_MAPPING["GOOGLE_KEY_6"]="GOOGLE_AI_STUDIO_KEY_FIX_2"

# Display migration plan
echo "Migration Plan:"
echo "  GOOGLE_KEY_1 (Chat)   → GOOGLE_AI_STUDIO_KEY_CHAT_1"
echo "  GOOGLE_KEY_2 (Chat)   → GOOGLE_AI_STUDIO_KEY_CHAT_2"
echo "  GOOGLE_KEY_3 (Image)  → GOOGLE_AI_STUDIO_KEY_IMAGE_1"
echo "  GOOGLE_KEY_4 (Image)  → GOOGLE_AI_STUDIO_KEY_IMAGE_2"
echo "  GOOGLE_KEY_5 (Fix)    → GOOGLE_AI_STUDIO_KEY_FIX_1"
echo "  GOOGLE_KEY_6 (Fix)    → GOOGLE_AI_STUDIO_KEY_FIX_2"
echo ""

# Ask for confirmation
read -p "Proceed with migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Setting new secrets...${NC}"

# Set new secrets
npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_1="$GOOGLE_KEY_1"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_CHAT_1${NC}"

npx supabase secrets set GOOGLE_AI_STUDIO_KEY_CHAT_2="$GOOGLE_KEY_2"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_CHAT_2${NC}"

npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_1="$GOOGLE_KEY_3"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_IMAGE_1${NC}"

npx supabase secrets set GOOGLE_AI_STUDIO_KEY_IMAGE_2="$GOOGLE_KEY_4"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_IMAGE_2${NC}"

npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_1="$GOOGLE_KEY_5"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_FIX_1${NC}"

npx supabase secrets set GOOGLE_AI_STUDIO_KEY_FIX_2="$GOOGLE_KEY_6"
echo -e "${GREEN}✓ Set GOOGLE_AI_STUDIO_KEY_FIX_2${NC}"

echo ""
echo -e "${YELLOW}Verifying migration...${NC}"
npx supabase secrets list

echo ""
echo -e "${YELLOW}Ready to delete old secrets?${NC}"
read -p "Delete GOOGLE_KEY_1..6? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npx supabase secrets unset GOOGLE_KEY_1 GOOGLE_KEY_2 GOOGLE_KEY_3 GOOGLE_KEY_4 GOOGLE_KEY_5 GOOGLE_KEY_6
    echo -e "${GREEN}✓ Old secrets deleted${NC}"
else
    echo "Old secrets retained (can delete manually if needed)"
fi

echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Deploy functions: npm run deploy"
echo "  2. Test rotation is working (check logs)"
echo "  3. Verify no 429 errors during usage"
echo ""

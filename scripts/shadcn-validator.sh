#!/bin/bash
# shadcn Validator - Prevents manual UI component creation
# 
# Usage: bash scripts/shadcn-validator.sh [file] [action]
# 
# Environment Variables:
#   SHADCN_BYPASS=true  - Disable all blocking
#   SHADCN_SILENT=true  - Hide informational messages

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check bypass mode
if [[ "${SHADCN_BYPASS}" == "true" ]]; then
    [[ "${SHADCN_SILENT}" != "true" ]] && echo -e "${BLUE}🔓 shadcn validator bypassed${NC}"
    exit 0
fi

[[ "${SHADCN_SILENT}" != "true" ]] && echo -e "${YELLOW}🔍 shadcn Validator Active${NC}"

# Block manual UI component creation
if [[ "$1" == *"components/ui"* ]] && [[ "$2" == "create" || "$2" == "write" ]]; then
    # Allow editing existing files
    if [[ -f "$1" ]]; then
        [[ "${SHADCN_SILENT}" != "true" ]] && echo -e "${GREEN}✅ Editing existing component: allowed${NC}"
        exit 0
    fi
    
    # Block new component creation
    echo -e "${RED}❌ BLOCKED: Manual UI component creation!${NC}"
    echo -e "${GREEN}✅ USE: npx shadcn@latest add @shadcn/[component]${NC}"
    echo -e "${BLUE}💡 Bypass: export SHADCN_BYPASS=true${NC}"
    exit 1
fi

# Show existing components
if [[ "${SHADCN_SILENT}" != "true" ]]; then
    echo -e "${GREEN}📦 Existing shadcn components:${NC}"
    ls frontend/src/components/ui/*.tsx 2>/dev/null | xargs -n1 basename | sed 's/\.tsx$//' | column || echo "  None found"
    
    echo -e "${YELLOW}💡 shadcn CLI Commands:${NC}"
    echo "  • Add: npx shadcn@latest add @shadcn/[name]"
    echo "  • Search: npx shadcn@latest search @shadcn"
    echo "  • View: npx shadcn@latest view @shadcn/[name]"
    echo "  • Update: npx shadcn@latest diff [name]"
fi

exit 0
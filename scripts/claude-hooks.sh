#!/bin/bash
# Claude Code Hooks for shadcn UI Validation
# This script integrates with Claude Code's hook system

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get hook type and parameters
HOOK_TYPE="${1:-pre-edit}"
FILE_PATH="${2:-}"
ACTION="${3:-}"

# Project root
PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$PROJECT_ROOT"

# Function to check if file is in UI components
is_ui_component() {
    [[ "$1" == *"components/ui"* ]] || [[ "$1" == *"src/components/ui"* ]]
}

# Function to check if component exists
component_exists() {
    local component_name=$(basename "$1" .tsx | sed 's/\.jsx$//' | sed 's/\.ts$//' | sed 's/\.js$//')
    [[ -f "frontend/src/components/ui/${component_name}.tsx" ]]
}

# Function to suggest shadcn command
suggest_shadcn_command() {
    local component_name=$(basename "$1" .tsx | sed 's/\.jsx$//' | sed 's/\.ts$//' | sed 's/\.js$//')
    echo -e "${GREEN}✅ USE: npx shadcn@latest add @shadcn/${component_name}${NC}"
    echo -e "${YELLOW}📦 Search: npx shadcn@latest search @shadcn${NC}"
    echo -e "${BLUE}👁️  View: npx shadcn@latest view @shadcn/${component_name}${NC}"
}

# Main hook logic
case "$HOOK_TYPE" in
    "pre-edit")
        if is_ui_component "$FILE_PATH"; then
            if component_exists "$FILE_PATH"; then
                echo -e "${GREEN}✅ Editing existing shadcn component${NC}"
                exit 0
            else
                echo -e "${YELLOW}⚠️  Component doesn't exist yet${NC}"
                suggest_shadcn_command "$FILE_PATH"
                exit 0  # Allow edit but warn
            fi
        fi
        ;;
        
    "pre-write"|"pre-create")
        if is_ui_component "$FILE_PATH"; then
            if [[ "$SHADCN_BYPASS" == "true" ]]; then
                echo -e "${BLUE}🔓 shadcn validation bypassed${NC}"
                exit 0
            fi
            
            if ! component_exists "$FILE_PATH"; then
                echo -e "${RED}❌ BLOCKED: Manual UI component creation detected!${NC}"
                suggest_shadcn_command "$FILE_PATH"
                echo -e "${BLUE}💡 To bypass: export SHADCN_BYPASS=true${NC}"
                exit 1
            fi
        fi
        ;;
        
    "post-edit"|"post-write")
        if is_ui_component "$FILE_PATH"; then
            # Verify imports
            if grep -q "import.*from.*['\"]react['\"]" "$FILE_PATH" 2>/dev/null; then
                if ! grep -q "@/components/ui" "$FILE_PATH" 2>/dev/null; then
                    echo -e "${YELLOW}⚠️  Consider using @/components/ui imports${NC}"
                fi
            fi
            
            # Check for common issues
            if grep -q "export default function" "$FILE_PATH" 2>/dev/null; then
                echo -e "${YELLOW}⚠️  shadcn components typically use named exports${NC}"
            fi
        fi
        ;;
        
    "pre-command")
        # Check if command seems UI-related
        if [[ "$FILE_PATH" =~ (create|add|new).*(component|ui|button|card|form) ]]; then
            echo -e "${YELLOW}💡 UI Component Detected!${NC}"
            echo -e "${GREEN}Use shadcn CLI instead:${NC}"
            echo "  • Add: npx shadcn@latest add @shadcn/[component]"
            echo "  • Search: npx shadcn@latest search @shadcn"
            echo "  • View: npx shadcn@latest view @shadcn/[component]"
        fi
        ;;
        
    "list-components")
        echo -e "${GREEN}📦 Installed shadcn components:${NC}"
        ls -1 frontend/src/components/ui/*.tsx 2>/dev/null | xargs -n1 basename | sed 's/\.tsx$//' | column || echo "None found"
        ;;
        
    "validate-all")
        echo -e "${YELLOW}🔍 Validating shadcn setup...${NC}"
        
        # Check components.json
        if [[ -f "frontend/components.json" ]]; then
            echo -e "${GREEN}✅ components.json found${NC}"
        else
            echo -e "${RED}❌ components.json missing${NC}"
        fi
        
        # Check UI directory
        if [[ -d "frontend/src/components/ui" ]]; then
            count=$(ls -1 frontend/src/components/ui/*.tsx 2>/dev/null | wc -l)
            echo -e "${GREEN}✅ UI directory found with $count components${NC}"
        else
            echo -e "${RED}❌ UI directory missing${NC}"
        fi
        
        # Check CLI availability
        if command -v npx &> /dev/null; then
            echo -e "${GREEN}✅ npx available for shadcn CLI${NC}"
        else
            echo -e "${RED}❌ npx not found${NC}"
        fi
        ;;
        
    *)
        echo "Usage: $0 {pre-edit|pre-write|post-edit|pre-command|list-components|validate-all} [file] [action]"
        exit 0
        ;;
esac

exit 0
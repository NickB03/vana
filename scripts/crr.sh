#!/bin/bash

# CodeRabbit Review Command - /crr
# Automatically detects current PR and applies suggestions

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐰 CodeRabbit Review Helper${NC}"
echo "=========================="

# Function to get current branch
get_current_branch() {
    git rev-parse --abbrev-ref HEAD 2>/dev/null
}

# Function to find PR number for current branch
find_pr_number() {
    local branch=$(get_current_branch)
    
    # Method 1: Check if gh CLI can find the PR
    if command -v gh &> /dev/null; then
        PR_NUM=$(gh pr view --json number --jq .number 2>/dev/null || echo "")
        if [ -n "$PR_NUM" ]; then
            echo "$PR_NUM"
            return 0
        fi
    fi
    
    # Method 2: Check recent commit messages for PR references
    PR_NUM=$(git log -1 --pretty=%B | grep -oE '#[0-9]+' | head -1 | tr -d '#' || echo "")
    if [ -n "$PR_NUM" ]; then
        echo "$PR_NUM"
        return 0
    fi
    
    # Method 3: Check if branch name contains PR number
    PR_NUM=$(echo "$branch" | grep -oE 'pr[/-]?[0-9]+' | grep -oE '[0-9]+' || echo "")
    if [ -n "$PR_NUM" ]; then
        echo "$PR_NUM"
        return 0
    fi
    
    return 1
}

# Function to extract owner and repo from git remote
get_repo_info() {
    local remote_url=$(git remote get-url origin 2>/dev/null)
    
    # Handle SSH format: git@github.com:owner/repo.git
    if [[ "$remote_url" =~ git@github.com:([^/]+)/([^.]+) ]]; then
        OWNER="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]}"
    # Handle HTTPS format: https://github.com/owner/repo.git
    elif [[ "$remote_url" =~ github.com/([^/]+)/([^.]+) ]]; then
        OWNER="${BASH_REMATCH[1]}"
        REPO="${BASH_REMATCH[2]%.git}"
    else
        return 1
    fi
    
    echo "$OWNER $REPO"
}

# Main execution
main() {
    # Check if we're in a git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}❌ Not in a git repository${NC}"
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}⚠️  You have uncommitted changes${NC}"
        echo -e "   Consider committing or stashing them first"
        echo ""
    fi
    
    # Get repository info
    REPO_INFO=$(get_repo_info)
    if [ -z "$REPO_INFO" ]; then
        echo -e "${RED}❌ Could not determine repository info${NC}"
        echo "   Make sure you have a GitHub remote configured"
        exit 1
    fi
    
    OWNER=$(echo "$REPO_INFO" | cut -d' ' -f1)
    REPO=$(echo "$REPO_INFO" | cut -d' ' -f2)
    
    echo -e "📦 Repository: ${GREEN}$OWNER/$REPO${NC}"
    
    # Try to find PR number
    if [ -n "$1" ]; then
        # PR number provided as argument
        PR_NUMBER="$1"
        echo -e "📌 Using provided PR: ${GREEN}#$PR_NUMBER${NC}"
    else
        # Try to auto-detect PR number
        PR_NUMBER=$(find_pr_number)
        if [ -z "$PR_NUMBER" ]; then
            echo -e "${YELLOW}Could not auto-detect PR number${NC}"
            echo ""
            echo "Usage options:"
            echo "  /crr          - Auto-detect current PR"
            echo "  /crr 123      - Specific PR number"
            echo "  /crr list     - List recent PRs"
            echo "  /crr help     - Show this help"
            echo ""
            
            # Offer to list recent PRs
            if command -v gh &> /dev/null; then
                echo "Recent PRs for this repo:"
                gh pr list --limit 5 --json number,title,headRefName --jq '.[] | "  #\(.number): \(.title) (\(.headRefName))"'
                echo ""
                echo -e "${YELLOW}Enter PR number:${NC} "
                read -r PR_NUMBER
                if [ -z "$PR_NUMBER" ]; then
                    exit 0
                fi
            else
                exit 1
            fi
        else
            echo -e "🔍 Auto-detected PR: ${GREEN}#$PR_NUMBER${NC}"
        fi
    fi
    
    # Special commands
    if [ "$PR_NUMBER" = "list" ]; then
        echo -e "${BLUE}Recent PRs:${NC}"
        gh pr list --limit 10 --json number,title,state,headRefName --jq '.[] | "  #\(.number): \(.title) [\(.state)] (\(.headRefName))"'
        exit 0
    elif [ "$PR_NUMBER" = "help" ]; then
        echo "CodeRabbit Review Commands:"
        echo "  /crr          - Apply suggestions from current PR"
        echo "  /crr 123      - Apply suggestions from PR #123"
        echo "  /crr list     - List recent PRs"
        echo "  /crr review   - Request new CodeRabbit review"
        echo "  /crr status   - Check PR review status"
        echo "  /crr help     - Show this help"
        exit 0
    elif [ "$PR_NUMBER" = "review" ]; then
        echo -e "${BLUE}Requesting CodeRabbit review...${NC}"
        gh pr comment --body "@coderabbitai review"
        echo -e "${GREEN}✅ Review requested${NC}"
        exit 0
    elif [ "$PR_NUMBER" = "status" ]; then
        echo -e "${BLUE}Checking CodeRabbit review status...${NC}"
        echo "================================================"
        
        # Get PR number for current branch if not specified
        CURRENT_PR=$(find_pr_number)
        if [ -z "$CURRENT_PR" ]; then
            echo -e "${RED}❌ Could not detect PR number${NC}"
            exit 1
        fi
        
        echo -e "📌 PR #${CURRENT_PR}"
        
        # Check for CodeRabbit comments
        echo -e "\n${YELLOW}🐰 CodeRabbit Review Status:${NC}"
        
        # Get all comments and check for CodeRabbit
        CODERABBIT_COMMENTS=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .createdAt' | wc -l | tr -d ' ')
        
        if [ "$CODERABBIT_COMMENTS" -eq 0 ]; then
            echo -e "  ${RED}⏳ No CodeRabbit review yet${NC}"
            echo -e "  💡 Tip: Request a review with: ${GREEN}/crr review${NC}"
        else
            # Check for review completion indicators
            REVIEW_COMPLETE=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .body' | grep -E "(## Walkthrough|## Summary|Review Status: Complete)" | head -1)
            
            if [ -n "$REVIEW_COMPLETE" ]; then
                echo -e "  ${GREEN}✅ Review Complete${NC}"
                
                # Count issues found
                CRITICAL=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .body' | grep -c "🔴" || true)
                HIGH=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .body' | grep -c "🟠" || true)
                WARNINGS=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .body' | grep -c "⚠️" || true)
                SUGGESTIONS=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .body' | grep -c "💡" || true)
                
                echo ""
                echo -e "  ${BLUE}📊 Review Summary:${NC}"
                [ "$CRITICAL" -gt 0 ] && echo -e "    🔴 Critical Issues: ${RED}$CRITICAL${NC}"
                [ "$HIGH" -gt 0 ] && echo -e "    🟠 High Priority: ${YELLOW}$HIGH${NC}"
                [ "$WARNINGS" -gt 0 ] && echo -e "    ⚠️  Warnings: ${YELLOW}$WARNINGS${NC}"
                [ "$SUGGESTIONS" -gt 0 ] && echo -e "    💡 Suggestions: ${GREEN}$SUGGESTIONS${NC}"
                
                # Show last comment time
                LAST_COMMENT=$(gh pr view "$CURRENT_PR" --json comments --jq '.comments[] | select(.author.login == "coderabbitai" or .author.login == "coderabbitai[bot]") | .createdAt' | tail -1)
                echo ""
                echo -e "  ⏰ Last review: ${BLUE}$LAST_COMMENT${NC}"
                
                # Check if there are actionable items
                if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
                    echo ""
                    echo -e "  ${YELLOW}⚡ Action Required:${NC}"
                    echo -e "    1. Apply suggestions: ${GREEN}/crr${NC}"
                    echo -e "    2. Review changes: ${GREEN}git diff${NC}"
                    echo -e "    3. Push updates: ${GREEN}git push${NC}"
                    echo -e "    4. Request re-review: ${GREEN}/crr review${NC}"
                fi
            else
                echo -e "  ${YELLOW}🔄 Review in progress...${NC}"
                echo -e "  💡 CodeRabbit is analyzing your code"
                echo -e "  ⏱️  This usually takes 1-3 minutes"
            fi
        fi
        
        # Show PR labels related to CodeRabbit
        echo ""
        echo -e "${BLUE}🏷️  PR Labels:${NC}"
        gh pr view "$CURRENT_PR" --json labels --jq '.labels[] | "  - \(.name)"' | grep -E "(coderabbit|critical|blocks-merge|needs-attention|type-errors)" || echo "  None related to CodeRabbit"
        
        # Show basic PR info
        echo ""
        echo -e "${BLUE}📋 PR Info:${NC}"
        gh pr view "$CURRENT_PR" --json number,title,state,url --jq '"  Title: \(.title)\n  State: \(.state)\n  URL: \(.url)"'
        
        exit 0
    fi
    
    # Ensure GitHub token is available
    if [ -z "$GITHUB_TOKEN" ]; then
        if command -v gh &> /dev/null; then
            export GITHUB_TOKEN=$(gh auth token)
        else
            echo -e "${RED}❌ GitHub token not found${NC}"
            echo "   Set GITHUB_TOKEN or install gh CLI"
            exit 1
        fi
    fi
    
    # Apply CodeRabbit suggestions
    echo ""
    echo -e "${BLUE}🤖 Applying CodeRabbit suggestions from PR #$PR_NUMBER...${NC}"
    echo "------------------------------------------------"
    
    # Run the Node.js script
    node "$(dirname "$0")/coderabbit-simple-apply.js" "$OWNER" "$REPO" "$PR_NUMBER"
    
    RESULT=$?
    
    if [ $RESULT -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✨ CodeRabbit suggestions processed!${NC}"
        echo ""
        echo "Quick actions:"
        echo "  git diff          - Review changes"
        echo "  git push          - Update PR"
        echo "  /crr review       - Request new review"
    else
        echo ""
        echo -e "${YELLOW}Some suggestions could not be applied${NC}"
        echo "This is normal for complex suggestions"
    fi
}

# Handle arguments
case "$1" in
    list|help|review|status)
        main "$1"
        ;;
    [0-9]*)
        main "$1"
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo "Use '/crr help' for usage information"
        exit 1
        ;;
esac
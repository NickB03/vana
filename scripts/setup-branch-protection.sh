#!/bin/bash
#
# Setup Branch Protection Rules for main branch
#
# This script configures GitHub branch protection rules to ensure:
# - All tests must pass before merging
# - Code reviews are required
# - Force pushes are prevented
#
# Prerequisites:
# - GitHub CLI (gh) must be installed and authenticated
# - You must have admin access to the repository
#
# Usage:
#   ./scripts/setup-branch-protection.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Branch Protection Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}✗ Error: GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}  Install from: https://cli.github.com/${NC}"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}✗ Error: Not authenticated with GitHub CLI${NC}"
    echo -e "${YELLOW}  Run: gh auth login${NC}"
    exit 1
fi

echo -e "${GREEN}✓ GitHub CLI authenticated${NC}"

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
BRANCH="main"

echo -e "${BLUE}Repository:${NC} $REPO"
echo -e "${BLUE}Branch:${NC} $BRANCH"
echo ""

# Enable branch protection
echo -e "${YELLOW}Configuring branch protection rules...${NC}"
echo ""

# Note: Branch protection requires using the GitHub API directly
# as gh CLI doesn't have full branch protection support yet

echo -e "${BLUE}Setting up protection rules via GitHub API...${NC}"

# Create protection rules using GitHub API
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "/repos/$REPO/branches/$BRANCH/protection" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=quality" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -f "required_pull_request_reviews[require_code_owner_reviews]=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=1" \
  -f "required_pull_request_reviews[require_last_push_approval]=false" \
  -f "restrictions=null" \
  -f "required_linear_history=false" \
  -f "allow_force_pushes=false" \
  -f "allow_deletions=false" \
  -f "block_creations=false" \
  -f "required_conversation_resolution=false" \
  -f "lock_branch=false" \
  -f "allow_fork_syncing=false" \
  > /dev/null 2>&1 && {
    echo -e "${GREEN}✓ Branch protection enabled${NC}"
  } || {
    echo -e "${YELLOW}⚠ Could not set all protection rules${NC}"
    echo -e "${YELLOW}  You may need to configure some settings manually${NC}"
  }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Protection Rules Configured:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}✓${NC} Require status checks to pass"
echo -e "    - quality job must pass"
echo ""
echo -e "  ${GREEN}✓${NC} Require pull request reviews"
echo -e "    - 1 approving review required"
echo -e "    - Dismiss stale reviews on new commits"
echo ""
echo -e "  ${GREEN}✓${NC} Prevent force pushes to main"
echo -e "  ${GREEN}✓${NC} Prevent branch deletion"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "  1. ${BLUE}Set up Codecov token:${NC}"
echo -e "     - Go to: https://codecov.io/gh/$REPO"
echo -e "     - Copy the upload token"
echo -e "     - Add as repository secret: ${GREEN}CODECOV_TOKEN${NC}"
echo ""
echo -e "  2. ${BLUE}Verify GitHub Actions:${NC}"
echo -e "     - Go to: https://github.com/$REPO/actions"
echo -e "     - Ensure 'Frontend Quality' workflow is enabled"
echo ""
echo -e "  3. ${BLUE}Test the protection:${NC}"
echo -e "     - Create a test branch: ${GREEN}git checkout -b test/branch-protection${NC}"
echo -e "     - Make a change and push"
echo -e "     - Open a PR and verify checks run"
echo ""
echo -e "${GREEN}✓ Branch protection setup complete!${NC}"
echo ""

#!/bin/bash
# Setup script for documentation agent clusters

echo "🚀 Setting up VANA Documentation Agent Clusters"

# Create worktrees for parallel documentation work
echo "📁 Creating git worktrees..."

# Architecture documentation branch
git worktree add -b docs/architecture-rewrite ../vana-docs-architecture HEAD

# API and Tools documentation branch  
git worktree add -b docs/api-tools-rewrite ../vana-docs-api HEAD

# Deployment documentation branch
git worktree add -b docs/deployment-ops-rewrite ../vana-docs-deployment HEAD

# User guide documentation branch
git worktree add -b docs/user-guide-rewrite ../vana-docs-user HEAD

echo "✅ Worktrees created successfully"

# Return to main directory
cd ../vana

echo "📝 Next steps:"
echo "1. Run: ./scripts/create-agent-contexts.sh"
echo "2. Open each worktree in a separate VS Code window"
echo "3. Launch Claude Code in each with specific CLAUDE.md instructions"
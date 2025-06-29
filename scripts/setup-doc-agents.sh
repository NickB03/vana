#!/bin/bash
# Setup script for documentation agent clusters

echo "🚀 Setting up VANA Documentation Agent Clusters"

# Create worktrees for parallel documentation work
echo "📁 Creating git worktrees..."

# Architecture documentation branch
git worktree add ../vana-docs-architecture docs/architecture-rewrite
cd ../vana-docs-architecture
git checkout -b docs/architecture-rewrite

# API and Tools documentation branch  
cd ../vana
git worktree add ../vana-docs-api docs/api-tools-rewrite
cd ../vana-docs-api
git checkout -b docs/api-tools-rewrite

# Deployment documentation branch
cd ../vana
git worktree add ../vana-docs-deployment docs/deployment-ops-rewrite
cd ../vana-docs-deployment
git checkout -b docs/deployment-ops-rewrite

# User guide documentation branch
cd ../vana
git worktree add ../vana-docs-user docs/user-guide-rewrite
cd ../vana-docs-user
git checkout -b docs/user-guide-rewrite

echo "✅ Worktrees created successfully"

# Return to main directory
cd ../vana

echo "📝 Next steps:"
echo "1. Run: ./scripts/create-agent-contexts.sh"
echo "2. Open each worktree in a separate VS Code window"
echo "3. Launch Claude Code in each with specific CLAUDE.md instructions"
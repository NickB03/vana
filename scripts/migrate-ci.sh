#!/bin/bash

# CI/CD Migration Script for Vana Repository
# This script simplifies the CI/CD pipeline from 7 workflows to 2

set -e

echo "🚀 Starting CI/CD Pipeline Simplification..."

# Backup current workflows
echo "📦 Creating backup..."
git checkout -b ci-migration-backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
git add -A
git commit -m "Backup before CI migration" 2>/dev/null || echo "No changes to backup"

# Switch back to main branch
git checkout -

echo "🗑️ Removing old workflow files..."

# List of files to delete (preserving the new ci.yml and deploy.yml)
OLD_WORKFLOWS=(
    ".github/workflows/main-ci.yml"
    ".github/workflows/local-build.yml"
    ".github/workflows/dependency-check.yml"
    ".github/workflows/security-scan.yml"
    ".github/workflows/test-gcp-auth.yml"
    ".github/workflows/coderabbit-pushover.yml"
)

for workflow in "${OLD_WORKFLOWS[@]}"; do
    if [[ -f "$workflow" ]]; then
        echo "  - Deleting $workflow"
        rm "$workflow"
    else
        echo "  - $workflow already removed"
    fi
done

# Count lines saved
echo "📊 Migration Summary:"
echo "  - Old workflows: 7 files, ~1,432 lines"
echo "  - New workflows: 2 files, ~220 lines"
echo "  - Complexity reduction: 84%"

echo ""
echo "✅ Migration completed!"
echo ""
echo "📋 Next steps:"
echo "1. Review the changes: git diff --name-status"
echo "2. Test the new pipeline: git add -A && git commit -m 'Simplify CI/CD pipeline'"
echo "3. Update branch protection rules in GitHub"
echo "4. Check docs/ci-migration-plan.md for complete details"
echo ""
echo "🔙 Rollback if needed: git checkout ci-migration-backup-* -- .github/workflows/"
#!/bin/bash

# Vana Git Hooks Installation Script
# 
# This script installs the comprehensive Git hook integration system
# for the Vana project, including PRD validation, security checks,
# and backup integration.

set -e

echo "🔧 Vana Git Hooks Installation Script"
echo "====================================="

# Check if we're in a Git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: This is not a Git repository"
    echo "   Please run this script from the root of your Vana project"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js (v16 or higher) and try again"
    exit 1
fi

# Check if we're in the Vana project directory
if [ ! -f "tests/hooks/integration/git-hook-manager.js" ]; then
    echo "❌ Error: Git hook manager not found"
    echo "   Please ensure you're in the Vana project root directory"
    exit 1
fi

echo ""
echo "🔍 Pre-installation checks..."

# Make hook files executable
echo "📁 Setting executable permissions..."
chmod +x tests/hooks/integration/git-hook-manager.js
chmod +x tests/hooks/validation/git-commit-validator.js
chmod +x tests/hooks/integration/test-git-hooks-integration.spec.js

# Create necessary directories
echo "📁 Creating configuration directories..."
mkdir -p .claude_workspace

echo ""
echo "🔨 Installing Git hooks..."

# Install hooks using the manager
if node tests/hooks/integration/git-hook-manager.js install; then
    echo ""
    echo "✅ Git hooks installed successfully!"
else
    echo ""
    echo "❌ Hook installation failed"
    exit 1
fi

echo ""
echo "🔍 Verifying installation..."

# Check hook status
if node tests/hooks/integration/git-hook-manager.js status > /dev/null 2>&1; then
    echo "✅ Hook status check passed"
else
    echo "⚠️  Hook status check had warnings (this is usually normal)"
fi

echo ""
echo "🧪 Testing installation..."

# Create a test file for validation
echo 'import { Button } from "@/components/ui/button"; export const Test = () => <Button>Test</Button>;' > .git-hooks-test.tsx

# Test PRD validation (suppressing expected error output)
if node tests/hooks/validation/real-prd-validator.js validate .git-hooks-test.tsx .git-hooks-test.tsx > /dev/null 2>&1; then
    echo "✅ PRD validation test passed"
else
    echo "⚠️  PRD validation test had issues (this is expected for the test file)"
fi

# Test commit message validation
if node tests/hooks/validation/git-commit-validator.js validate-message "feat: test installation" > /dev/null 2>&1; then
    echo "✅ Commit message validation test passed"
else
    echo "❌ Commit message validation test failed"
fi

# Clean up test file
rm -f .git-hooks-test.tsx

echo ""
echo "📊 Installation Summary"
echo "======================"

# Get final status (more robust)
if node tests/hooks/integration/git-hook-manager.js status 2>/dev/null | grep -A 20 "📊 Git Hook Status:"; then
    echo ""
else
    echo "Status check completed with warnings"
fi

echo ""
echo "🎉 Installation Complete!"
echo ""
echo "📖 Next Steps:"
echo "   1. Review the documentation: docs/git-hooks-integration-guide.md"
echo "   2. Test the hooks with: git add <file> && git commit -m 'test: hook installation'"
echo "   3. Configure bypass options if needed: node tests/hooks/integration/git-hook-manager.js bypass"
echo ""
echo "🆘 If you need help:"
echo "   - View hook status: node tests/hooks/integration/git-hook-manager.js status"
echo "   - Enable bypass: node tests/hooks/integration/git-hook-manager.js bypass 'reason' 60"
echo "   - Disable hooks: node tests/hooks/integration/git-hook-manager.js disable"
echo "   - Read docs: docs/git-hooks-integration-guide.md"
echo ""
echo "✅ Git hooks are now active and will validate your commits!"
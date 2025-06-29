#!/bin/bash
# Documentation cleanup script - removes all outdated/inaccurate documentation

echo "🧹 VANA Documentation Cleanup Script"
echo "===================================="
echo "This script will remove all existing documentation to prepare for accurate rewrite"
echo ""

# Safety check
read -p "⚠️  This will DELETE all existing documentation. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 1
fi

# Create backup branch first
echo "📸 Creating backup branch..."
git checkout -b backup/docs-before-cleanup
git checkout -

# Create new branch for cleanup
echo "🌿 Creating clean documentation branch..."
git checkout -b docs/complete-rewrite

echo "🗑️  Starting cleanup..."

# Remove all existing documentation directories
echo "  Removing /docs directory..."
git rm -rf docs/

echo "  Removing legacy /memory-bank directory..."
git rm -rf memory-bank/

echo "  Removing outdated root-level documentation..."
# Keep only essential files
git rm -f agent_reasoning_*.md 2>/dev/null || true
git rm -f comprehensive_test*.md 2>/dev/null || true
git rm -f session-errors.md 2>/dev/null || true
git rm -f setupissues.md 2>/dev/null || true

# Remove outdated test documentation
echo "  Cleaning test documentation..."
find tests -name "*.md" -not -path "*/test_data/*" -exec git rm {} \; 2>/dev/null || true

# Remove component READMEs that are outdated
echo "  Removing outdated component documentation..."
git rm -f dashboard/README.md 2>/dev/null || true
git rm -f tools/memory/README.md 2>/dev/null || true
git rm -f lib/mcp/README.md 2>/dev/null || true

# Create new documentation structure
echo "📁 Creating new documentation structure..."
mkdir -p docs/getting-started
mkdir -p docs/architecture/diagrams
mkdir -p docs/api-reference/tools
mkdir -p docs/user-guide/tutorials
mkdir -p docs/developer-guide
mkdir -p docs/deployment
mkdir -p docs/reference

# Create placeholder files with accurate templates
echo "📝 Creating documentation templates..."

cat > docs/README.md << 'EOF'
# VANA Documentation

> **Status**: Under Complete Rewrite
> **Last Updated**: $(date +%Y-%m-%d)

## 🚧 Documentation Rewrite in Progress

We are completely rewriting all documentation to ensure accuracy and reflect the actual system state.

### Why the Rewrite?
- Previous documentation claimed "FULLY OPERATIONAL" status when validation showed 46.2% working
- Missing critical dependency information (e.g., psutil)
- Inaccurate architectural descriptions
- No documentation of known issues or limitations

### Documentation Standards
All new documentation will:
- ✅ Be validated against actual code
- ✅ Include all dependencies and requirements
- ✅ Clearly mark "Working" vs "Planned" features
- ✅ Include troubleshooting for known issues
- ✅ Provide realistic examples that actually work

### Progress Tracking
- [ ] Getting Started Guide
- [ ] Architecture Documentation
- [ ] API & Tools Reference
- [ ] Deployment Guide
- [ ] User Tutorials
- [ ] Developer Guide

Check back soon for accurate, tested documentation!
EOF

cat > docs/getting-started/README.md << 'EOF'
# Getting Started with VANA

> **Status**: Planned
> **Last Verified**: Not yet verified
> **Dependencies**: To be documented

## Overview
[To be written based on actual testing]

## Prerequisites
[To be determined through validation]

## Installation
[To be written with all actual dependencies]

## First Steps
[To be created with working examples]

## Known Issues
[To be documented based on testing]
EOF

# Create .gitkeep files to preserve directory structure
touch docs/architecture/.gitkeep
touch docs/architecture/diagrams/.gitkeep
touch docs/api-reference/.gitkeep
touch docs/api-reference/tools/.gitkeep
touch docs/user-guide/.gitkeep
touch docs/user-guide/tutorials/.gitkeep
touch docs/developer-guide/.gitkeep
touch docs/deployment/.gitkeep
touch docs/reference/.gitkeep

# Create accurate README template
echo "📄 Updating main README.md..."
cat > README_TEMPLATE.md << 'EOF'
# 🤖 VANA - Multi-Agent AI System

> **Development Status**: Partially Operational (46.2% Infrastructure Working)
> **Documentation Status**: Under Complete Rewrite
> **Last Validation**: 2025-06-24

## ⚠️ Important Notice

This documentation is being completely rewritten to accurately reflect the system's current state. Previous documentation contained inaccurate claims. Please refer to the [Ground Truth Validation Report](docs/validation/GROUND_TRUTH_VALIDATION_REPORT.md) for actual system status.

## 🚨 Critical Requirements

### Required Dependencies
- Python 3.13+ (mandatory)
- psutil (currently missing - required for code execution)
- [Additional dependencies to be documented]

### Known Issues
- Code execution specialists non-functional (missing psutil)
- Vector search infrastructure not configured
- Some specialist agents failing to load
- See [Known Issues](docs/reference/known-issues.md) for complete list

## 🚀 Quick Start

[To be rewritten with accurate, tested instructions]

## 📊 Current System Status

Based on systematic validation (2025-06-24):
- **Core Tools**: ✅ 100% working
- **Infrastructure**: ⚠️ 46.2% working
- **Google ADK Compliance**: ⚠️ 50% compliant
- **Agent System**: ⚠️ Partially functional

See [Architecture Documentation](docs/architecture/README.md) for details.

## 📚 Documentation

All documentation is being rewritten for accuracy. Check the [docs](docs/) directory for updates.

## 🤝 Contributing

Please help us improve the documentation by reporting any inaccuracies or issues.

## 📝 License

[License information]
EOF

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review changes with: git status"
echo "2. Commit cleanup: git commit -m 'docs: Complete documentation cleanup for accurate rewrite'"
echo "3. Run: ./scripts/create-doc-validation-tests.sh"
echo "4. Run: ./scripts/setup-doc-agents.sh"
echo ""
echo "🎯 Ready to build accurate documentation from scratch!"
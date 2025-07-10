#!/bin/bash
# VANA Technical Debt Cleanup Script
# Purpose: Move/organize files to prevent AI agent confusion

set -e

echo "🧹 VANA Technical Debt Cleanup"
echo "=============================="

# Create necessary directories
echo "📁 Creating organized directories..."
mkdir -p tests/one_time_tests
mkdir -p tests/mocks
mkdir -p scripts/validation
mkdir -p scripts/debug
mkdir -p archived_docs/old_analysis
mkdir -p archived_docs/old_planning

# Move test files from root to tests/
echo "📦 Moving test files from root to tests/one_time_tests/..."
for file in test_*.py run_agent_test.py; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        git mv "$file" tests/one_time_tests/ 2>/dev/null || mv "$file" tests/one_time_tests/
    fi
done

# Move validation scripts
echo "📦 Moving validation scripts to scripts/validation/..."
for file in validate_*.py create_tool_test_generator.py fix_test_infrastructure.py; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        git mv "$file" scripts/validation/ 2>/dev/null || mv "$file" scripts/validation/
    fi
done

# Move debug scripts
echo "📦 Moving debug scripts..."
for file in debug_agent.py check_tool_defaults.py comprehensive_agent_audit.py; do
    if [ -f "$file" ]; then
        echo "  Moving $file"
        git mv "$file" scripts/debug/ 2>/dev/null || mv "$file" scripts/debug/
    fi
done

# Archive old documentation
echo "📄 Archiving outdated documentation..."
for file in ARCHITECTURE_ANALYSIS.md VECTOR_SEARCH_ANALYSIS.md AGENT_DOCUMENTATION_SUMMARY.md \
           DOCUMENTATION_AGENTS_REVIEW.md DOCUMENTATION_CLEANUP_STRATEGY.md \
           DOCUMENTATION_QUALITY_IMPROVEMENT_PLAN.md PARALLEL_AGENT_COMPACTION_STRATEGY.md \
           SESSION_HANDOFF_DOCUMENTATION_QUALITY.md blockers.md status.md; do
    if [ -f "$file" ]; then
        echo "  Archiving $file"
        git mv "$file" archived_docs/old_analysis/ 2>/dev/null || mv "$file" archived_docs/old_analysis/
    fi
done

# Move mock implementations to tests
echo "📦 Moving mock implementations to tests/mocks/..."
if [ -f "lib/_tools/mock_web_search.py" ]; then
    echo "  Moving mock_web_search.py"
    git mv "lib/_tools/mock_web_search.py" tests/mocks/ 2>/dev/null || mv "lib/_tools/mock_web_search.py" tests/mocks/
fi

# Create a marker file for web search implementations
echo "📝 Creating web search implementation guide..."
cat > lib/_tools/WEB_SEARCH_IMPLEMENTATION_GUIDE.md << 'EOF'
# Web Search Implementation Guide

## Current Active Implementation
Use only: `web_search_sync.py` - Synchronous implementation for ADK compatibility

## Deprecated Implementations (DO NOT USE)
- web_search_fixed.py - Old fix attempt
- web_search_no_defaults.py - Intermediate fix
- fixed_web_search.py - Another old fix
- simple_web_search.py - Fallback implementation
- mock_web_search.py - Moved to tests/mocks/
- search_coordinator_fixed.py - Old coordinator fix

## For AI Agents
When implementing web search functionality, ONLY import from:
```python
from lib._tools.web_search_sync import create_web_search_sync_tool
```
EOF

echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Review moved files in their new locations"
echo "2. Update imports in any code that referenced moved files"
echo "3. Consider deleting deprecated web search implementations"
echo "4. Update README.md with current infrastructure status"
echo "5. Run 'git status' to see all changes"
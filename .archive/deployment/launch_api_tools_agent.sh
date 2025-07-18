#!/bin/bash

# API & Tools Documentation Agent Launch Script

echo "🔧 Launching API & Tools Documentation Agent..."

# Navigate to API & Tools worktree
cd /Users/nick/Development/vana-docs-api

# Create anti-compaction settings
mkdir -p .claude
echo '{"autoCompact": false, "compactThreshold": 95}' > .claude/settings.local.json

# Create initial prompt file
cat > INITIAL_PROMPT.md << 'EOF'
You are the API & Tools Documentation Agent. Your task is to test and document ALL 59+ tools based on actual functionality. Focus on:

1. Test each tool in lib/_tools/ directory
2. Document which tools work vs which fail
3. Include actual error messages and stack traces
4. Test MCP integrations and document setup requirements
5. Verify tool permissions and conditional loading
6. Reference specific implementation files
7. Create working examples only for functional tools

Start by reading CLAUDE.md, then systematically test each tool category and document results.

First commands to run:
/config
/memory-status
EOF

echo "✅ Settings configured"
echo "📝 Initial prompt saved to INITIAL_PROMPT.md"
echo ""
echo "Launching VS Code and Claude..."

# Set environment variable and launch
export CLAUDE_AUTO_COMPACT_THRESHOLD=95
code . && claude

echo ""
echo "⚡ After Claude starts, run:"
echo "   1. /config"
echo "   2. /memory-status"
echo "   3. Copy and paste the prompt from INITIAL_PROMPT.md"
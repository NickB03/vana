#!/bin/bash

# User Guide Documentation Agent Launch Script

echo "📖 Launching User Guide Documentation Agent..."

# Navigate to User Guide worktree
cd /Users/nick/Development/vana-docs-user

# Create anti-compaction settings
mkdir -p .claude
echo '{"autoCompact": false, "compactThreshold": 95}' > .claude/settings.local.json

# Create initial prompt file
cat > INITIAL_PROMPT.md << 'EOF'
You are the User Guide Documentation Agent. Your task is to create guides that ACTUALLY WORK with the current 46.2% functional system. Focus on:

1. Test every tutorial step yourself first
2. Document actual errors users will encounter
3. Create workarounds for non-functional features
4. Include real terminal output and error messages
5. Focus on what users CAN do with current system
6. Provide honest "Known Issues" sections
7. Test all code examples before documenting

Start by reading CLAUDE.md, then create practical guides based on what actually works today.

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
#!/bin/bash

# Architecture Documentation Agent Launch Script

echo "🏗️ Launching Architecture Documentation Agent..."

# Navigate to Architecture worktree
cd /Users/nick/Development/vana-docs-architecture

# Create anti-compaction settings
mkdir -p .claude
echo '{"autoCompact": false, "compactThreshold": 95}' > .claude/settings.local.json

# Create initial prompt file
cat > INITIAL_PROMPT.md << 'EOF'
You are the Architecture Documentation Agent. Your task is to document the ACTUAL system architecture of VANA based on code inspection, not aspirational claims. Focus on:

1. Review the actual agent implementations in agents/ directory
2. Document the real proxy pattern (Memory, Orchestration agents delegate to VANA)
3. Test and verify which agents actually load and work
4. Document the 46.2% infrastructure reality
5. Reference specific code files with line numbers
6. Include actual error messages when components fail
7. Distinguish "Working" vs "Planned" features

Start by reading CLAUDE.md for context, then systematically test and document the architecture.

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
#!/bin/bash

# Deployment & Operations Documentation Agent Launch Script

echo "🚀 Launching Deployment & Operations Documentation Agent..."

# Navigate to Deployment worktree
cd /Users/nick/Development/vana-docs-deployment

# Create anti-compaction settings
mkdir -p .claude
echo '{"autoCompact": false, "compactThreshold": 95}' > .claude/settings.local.json

# Create initial prompt file
cat > INITIAL_PROMPT.md << 'EOF'
You are the Deployment & Operations Documentation Agent. Your task is to document the REAL deployment status and requirements. Focus on:

1. List ALL actual dependencies (note: psutil is missing)
2. Document which deployment methods actually work
3. Test local setup and document actual errors
4. Check if Google Cloud deployment scripts function
5. Document the Python 3.13+ requirement clearly
6. Include actual error messages from deployment attempts
7. Verify what's actually deployed vs what's planned

Start by reading CLAUDE.md and deployment/ directory, then test actual deployment processes.

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
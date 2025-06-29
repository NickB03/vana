#!/bin/bash

# Script to set up permissions for all documentation agents to avoid approval popups

echo "🔓 Setting up permissions for all documentation agents..."

# Architecture Agent
echo "Setting permissions for Architecture Agent..."
cat > /Users/nick/Development/vana-docs-architecture/.claude/settings.local.json << 'EOF'
{
  "autoCompact": false,
  "compactThreshold": 95,
  "permissions": {
    "allow": [
      "*"
    ]
  }
}
EOF

# API & Tools Agent  
echo "Setting permissions for API & Tools Agent..."
cat > /Users/nick/Development/vana-docs-api/.claude/settings.local.json << 'EOF'
{
  "autoCompact": false,
  "compactThreshold": 95,
  "permissions": {
    "allow": [
      "*"
    ]
  }
}
EOF

# Deployment Agent
echo "Setting permissions for Deployment Agent..."
cat > /Users/nick/Development/vana-docs-deployment/.claude/settings.local.json << 'EOF'
{
  "autoCompact": false,
  "compactThreshold": 95,
  "permissions": {
    "allow": [
      "*"
    ]
  }
}
EOF

# User Guide Agent
echo "Setting permissions for User Guide Agent..."
cat > /Users/nick/Development/vana-docs-user/.claude/settings.local.json << 'EOF'
{
  "autoCompact": false,
  "compactThreshold": 95,
  "permissions": {
    "allow": [
      "*"
    ]
  }
}
EOF

echo "✅ Permissions set for all agents!"
echo ""
echo "The agents now have permission to use all tools without asking."
echo "This includes: Read, Write, Bash, Grep, Glob, LS, etc."
echo ""
echo "If any agent is already running, you'll need to restart it for the permissions to take effect."
#!/bin/bash

# Fix Claude Code permissions format
echo "🔧 Fixing Claude Code user-level permissions format..."

# Backup current settings
cp ~/.claude/settings.json ~/.claude/settings.json.backup.$(date +%s)

# Create corrected settings with proper format
cat > ~/.claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(curl:*)",
      "Bash(wget:*)",
      "Bash(make:*)",
      "Bash(python:*)",
      "Bash(python3:*)",
      "Bash(pip:*)",
      "Bash(pip3:*)",
      "Bash(npm:*)",
      "Bash(npx:*)",
      "Bash(yarn:*)",
      "Bash(pnpm:*)",
      "Bash(git:*)",
      "Bash(gh:*)",
      "Bash(docker:*)",
      "Bash(kubectl:*)",
      "Bash(terraform:*)",
      "Bash(cat:*)",
      "Bash(ls:*)",
      "Bash(grep:*)",
      "Bash(find:*)",
      "Bash(sed:*)",
      "Bash(awk:*)",
      "Bash(jq:*)",
      "Bash(echo:*)",
      "Bash(pwd)",
      "Bash(whoami)",
      "Bash(date)",
      "Bash(env)",
      "Bash(which:*)",
      "Bash(ps:*)",
      "Bash(chmod:*)",
      "Bash(mkdir:*)",
      "Bash(touch:*)",
      "Bash(cp:*)",
      "Bash(mv:*)",
      "Bash(rm *.txt)",
      "Bash(rm *.tmp)",
      "Bash(pytest:*)",
      "Bash(ruff:*)",
      "Bash(black:*)",
      "Bash(mypy:*)",
      "Bash(eslint:*)",
      "Bash(prettier:*)",
      "Bash(tsc:*)",
      "Bash(cargo:*)",
      "Bash(go:*)",
      "Bash(java:*)",
      "Bash(node:*)",
      "Bash(deno:*)",
      "Bash(bun:*)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(curl * | bash)",
      "Bash(wget * | sh)"
    ]
  }
}
EOF

echo "✅ Permissions updated with correct format"

# Alternative: Try using full paths/exact commands
cat > ~/.claude/settings.alternative.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(/usr/bin/curl *)",
      "Bash(/usr/bin/make *)",
      "Bash(/usr/bin/python3 *)",
      "Bash(curl --version)",
      "Bash(make test)",
      "Bash(make lint)",
      "Bash(python --version)"
    ]
  }
}
EOF

echo "📝 Created alternative format at ~/.claude/settings.alternative.json"
echo ""
echo "Try restarting Claude Code again. If it still doesn't work, try:"
echo "  mv ~/.claude/settings.alternative.json ~/.claude/settings.json"
echo "  Then restart Claude Code"
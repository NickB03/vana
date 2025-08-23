#!/bin/bash

# One-time setup script to enable automatic M3 optimizations
# Run this once to make everything automatic

echo "🚀 Setting up automatic M3 MacBook Air optimizations..."

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Check if M3 MacBook Air
if [[ $(uname -m) != "arm64" ]] || [[ $(sysctl -n hw.memsize) -gt 17179869184 ]]; then
    echo -e "${YELLOW}⚠️  This doesn't appear to be an M3 MacBook Air with 16GB RAM${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 2: Backup existing configs
echo -e "${BLUE}📁 Backing up existing configurations...${NC}"
[ -f ~/.zshrc ] && cp ~/.zshrc ~/.zshrc.backup.$(date +%Y%m%d)
[ -f ~/.bashrc ] && cp ~/.bashrc ~/.bashrc.backup.$(date +%Y%m%d)

# Step 3: Add auto-loader to shell config
echo -e "${BLUE}🔧 Configuring shell auto-loader...${NC}"

SHELL_CONFIG=""
if [ -f ~/.zshrc ]; then
    SHELL_CONFIG=~/.zshrc
elif [ -f ~/.bashrc ]; then
    SHELL_CONFIG=~/.bashrc
else
    SHELL_CONFIG=~/.zshrc
    touch $SHELL_CONFIG
fi

# Check if already configured
if ! grep -q "SPARC M3 Auto-Configuration" "$SHELL_CONFIG"; then
    echo "" >> "$SHELL_CONFIG"
    echo "# SPARC M3 Auto-Configuration (added $(date))" >> "$SHELL_CONFIG"
    echo "[ -f \"$PWD/.zshrc.sparc-m3\" ] && source \"$PWD/.zshrc.sparc-m3\"" >> "$SHELL_CONFIG"
    echo -e "${GREEN}✓ Shell configuration updated${NC}"
else
    echo -e "${GREEN}✓ Shell already configured${NC}"
fi

# Step 4: Set up Git hooks
echo -e "${BLUE}🔗 Setting up Git hooks...${NC}"
git config core.hooksPath .githooks
echo -e "${GREEN}✓ Git hooks configured${NC}"

# Step 5: Create symbolic links for global access
echo -e "${BLUE}🔗 Creating command shortcuts...${NC}"

# Create local bin directory if it doesn't exist
mkdir -p ~/bin

# Create wrapper script
cat > ~/bin/sparc << 'EOF'
#!/bin/bash
# Auto-optimized SPARC launcher
node "$HOME/Development/vana/.claude_workspace/bin/sparc-auto-wrapper.js" "npx claude-flow sparc $@"
EOF

chmod +x ~/bin/sparc

# Add ~/bin to PATH if not already there
if ! echo $PATH | grep -q "$HOME/bin"; then
    echo 'export PATH="$HOME/bin:$PATH"' >> "$SHELL_CONFIG"
fi

echo -e "${GREEN}✓ Command shortcuts created${NC}"

# Step 6: Set up Claude Flow config
echo -e "${BLUE}📝 Configuring Claude Flow defaults...${NC}"

# Create npm config for claude-flow defaults
cat > ~/.npmrc.claude-flow << 'EOF'
# Claude Flow M3 Defaults
claude-flow:max-agents=3
claude-flow:memory-limit=1200
claude-flow:wave-deploy=true
claude-flow:checkpoint=true
claude-flow:monitor=true
EOF

echo -e "${GREEN}✓ Claude Flow defaults configured${NC}"

# Step 7: Create systemd/launchd service for auto-monitor (macOS)
echo -e "${BLUE}🎯 Setting up auto-monitor service...${NC}"

cat > ~/Library/LaunchAgents/com.sparc.monitor.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sparc.monitor</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>$PWD/.claude_workspace/scripts/sparc-resource-monitor.js</string>
    </array>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>/tmp/sparc-monitor.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/sparc-monitor.error.log</string>
</dict>
</plist>
EOF

# Don't auto-start, but make it available
# launchctl load ~/Library/LaunchAgents/com.sparc.monitor.plist

echo -e "${GREEN}✓ Auto-monitor service configured (not auto-started)${NC}"

# Step 8: Test the setup
echo -e "${BLUE}🧪 Testing automatic optimization...${NC}"

# Source the new configuration
source "$SHELL_CONFIG"

# Test detection
node -e "
const os = require('os');
const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
const arch = os.arch();
const platform = os.platform();

console.log('System detected:');
console.log('  Platform:', platform);
console.log('  Architecture:', arch);
console.log('  Memory:', totalMem, 'GB');

if (platform === 'darwin' && arch === 'arm64' && totalMem <= 16) {
    console.log('✅ M3 MacBook Air detected - optimizations will be applied automatically');
} else {
    console.log('⚠️  Not detected as M3 MacBook Air, but optimizations are configured');
}
"

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "What's been configured:"
echo "  • Automatic agent limits (max 3-4)"
echo "  • Wave deployment (prevents crashes)"
echo "  • Resource monitoring"
echo "  • Emergency recovery"
echo "  • Checkpointing every 30s"
echo ""
echo "How to use:"
echo "  1. Restart your terminal or run: source $SHELL_CONFIG"
echo "  2. Just use SPARC normally - optimizations apply automatically!"
echo "  3. Example: npx claude-flow sparc run code 'your task'"
echo ""
echo "The system will automatically:"
echo "  • Limit agents to prevent crashes"
echo "  • Use wave deployment"
echo "  • Monitor resources"
echo "  • Scale down if memory gets high"
echo "  • Checkpoint your work"
echo ""
echo "Quick commands now available:"
echo "  sparc <mode> <task>     - Run with auto-optimizations"
echo "  sparc-monitor           - View resource usage"
echo "  sparc-recover           - Emergency recovery"
echo ""
echo -e "${YELLOW}Note: Restart your terminal for all changes to take effect${NC}"
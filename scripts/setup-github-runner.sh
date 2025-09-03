#!/bin/bash

# Setup GitHub Actions Self-Hosted Runner
echo "🚀 Setting up GitHub Actions Self-Hosted Runner"

RUNNER_VERSION="2.319.1"
RUNNER_DIR="$HOME/actions-runner"

# Step 1: Download and setup runner
if [ ! -f "$RUNNER_DIR/run.sh" ]; then
    echo "📦 Downloading GitHub Actions Runner..."
    mkdir -p "$RUNNER_DIR"
    cd "$RUNNER_DIR"
    
    # Download runner for macOS ARM64
    curl -L -o actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz \
        https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz
    
    tar xzf ./actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz
    rm actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz
    
    echo ""
    echo "✅ Runner downloaded to $RUNNER_DIR"
    echo ""
    echo "📝 Now you need to configure it:"
    echo ""
    echo "1. Go to: https://github.com/NickB03/vana/settings/actions/runners/new"
    echo "2. Get the registration token"
    echo "3. Run the configuration below with YOUR token:"
    echo ""
    echo "cd $RUNNER_DIR"
    echo "./config.sh --url https://github.com/NickB03/vana --token YOUR_TOKEN_HERE --labels docker,self-hosted --name docker-runner"
    echo ""
else
    echo "✅ Runner already exists in $RUNNER_DIR"
fi

# Step 2: Create runner service script
cat > "$RUNNER_DIR/start-runner.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

# Check if runner is configured
if [ ! -f ".runner" ]; then
    echo "❌ Runner not configured. Please run ./config.sh first"
    exit 1
fi

# Start the runner
echo "🚀 Starting GitHub Actions Runner..."
./run.sh
EOF

chmod +x "$RUNNER_DIR/start-runner.sh"

# Step 3: Create launchd plist for auto-start
PLIST_PATH="$HOME/Library/LaunchAgents/com.github.actions.runner.plist"
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.github.actions.runner</string>
    <key>ProgramArguments</key>
    <array>
        <string>$RUNNER_DIR/start-runner.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$RUNNER_DIR</string>
    <key>StandardOutPath</key>
    <string>$RUNNER_DIR/logs/runner.log</string>
    <key>StandardErrorPath</key>
    <string>$RUNNER_DIR/logs/runner.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DOCKER_HOST</key>
        <string>unix:///var/run/docker.sock</string>
    </dict>
</dict>
</plist>
EOF

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure the runner (if not done):"
echo "   cd $RUNNER_DIR"
echo "   ./config.sh --url https://github.com/NickB03/vana --token YOUR_TOKEN --labels docker,self-hosted"
echo ""
echo "2. Start the runner manually (for testing):"
echo "   cd $RUNNER_DIR && ./run.sh"
echo ""
echo "3. OR start as a service (auto-start on login):"
echo "   launchctl load $PLIST_PATH"
echo ""
echo "4. Check runner status at:"
echo "   https://github.com/NickB03/vana/settings/actions/runners"
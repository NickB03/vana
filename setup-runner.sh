#!/bin/bash

# GitHub Self-Hosted Runner Setup for Mac M3
# Optimized for Vana project - Personal use

set -e

RUNNER_DIR="$HOME/actions-runner"
REPO_URL="https://github.com/NickB03/vana"
RUNNER_VERSION="2.311.0"
RUNNER_NAME="mac-m3-local"

echo "🚀 Setting up GitHub Self-Hosted Runner"
echo "======================================="

# Create runner directory
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Check if runner already downloaded
if [ ! -f "config.sh" ]; then
    echo "📥 Downloading GitHub Actions Runner..."
    curl -o actions-runner-osx-arm64.tar.gz -L \
        "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
    
    echo "📦 Extracting runner..."
    tar xzf actions-runner-osx-arm64.tar.gz
    rm actions-runner-osx-arm64.tar.gz
fi

echo ""
echo "🔑 Runner Registration"
echo "====================="
echo ""
echo "To get a registration token:"
echo "1. Go to: https://github.com/NickB03/vana/settings/actions/runners/new"
echo "2. Copy the token (starts with AHRA...)"
echo "3. Paste it below (it will be hidden)"
echo ""

read -s -p "Enter registration token: " TOKEN
echo ""

# Configure runner
echo "⚙️  Configuring runner..."
./config.sh \
    --url "$REPO_URL" \
    --token "$TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "self-hosted,macOS,ARM64,M3" \
    --work "_work" \
    --replace \
    --unattended

# Create optimization config
echo "🎯 Optimizing runner configuration..."
cat > .env << EOF
# Runner Optimizations
ACTIONS_RUNNER_PRINT_LOG_TO_STDOUT=1
RUNNER_ALLOW_RUNASROOT=0
ACTIONS_STEP_DEBUG=false

# Performance settings
DOTNET_CLI_TELEMETRY_OPTOUT=1
HOMEBREW_NO_AUTO_UPDATE=1
HOMEBREW_NO_INSTALL_CLEANUP=1

# Docker optimizations
DOCKER_BUILDKIT=1
COMPOSE_DOCKER_CLI_BUILD=1
EOF

# Install as service
echo "🔧 Installing runner as service..."
./svc.sh install

# Start service
echo "▶️  Starting runner service..."
./svc.sh start

echo ""
echo "✅ Runner setup complete!"
echo ""
echo "📊 Runner Status:"
./svc.sh status

echo ""
echo "🎯 Next Steps:"
echo "1. Update .github/workflows/ci.yml to use: runs-on: [self-hosted, macOS, ARM64]"
echo "2. Monitor logs: tail -f $RUNNER_DIR/_diag/Runner_*.log"
echo "3. Check status: $RUNNER_DIR/svc.sh status"
echo ""
echo "💡 Tips:"
echo "- Stop runner: $RUNNER_DIR/svc.sh stop"
echo "- Start runner: $RUNNER_DIR/svc.sh start"
echo "- Uninstall: $RUNNER_DIR/svc.sh uninstall"
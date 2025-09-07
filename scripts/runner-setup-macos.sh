#!/bin/bash
# GitHub Actions Runner Setup for macOS (M3)
# Run this on your local Mac

set -e

# Configuration
REPO_URL="https://github.com/NickB03/vana"
RUNNER_NAME="m3-macbook-air"
RUNNER_DIR="$HOME/actions-runner"
RUNNER_VERSION="2.321.0"  # Update as needed

echo "🚀 GitHub Actions Runner Setup for macOS"
echo "========================================="

# Check if already exists
if [ -d "$RUNNER_DIR" ]; then
    echo "⚠️  Runner directory already exists at $RUNNER_DIR"
    read -p "Remove and reinstall? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$RUNNER_DIR"
        ./svc.sh stop 2>/dev/null || true
        ./svc.sh uninstall 2>/dev/null || true
        cd ~
        rm -rf "$RUNNER_DIR"
    else
        echo "Exiting..."
        exit 0
    fi
fi

# Get registration token
echo ""
echo "📝 You need a registration token from GitHub:"
echo "   1. Go to: $REPO_URL/settings/actions/runners/new"
echo "   2. Copy the token (starts with AHRA...)"
echo ""
read -p "Enter registration token: " REG_TOKEN

# Create directory
mkdir -p "$RUNNER_DIR"
cd "$RUNNER_DIR"

# Download runner (ARM64 for M3)
echo "⬇️  Downloading runner v$RUNNER_VERSION..."
curl -L -o runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-osx-arm64-$RUNNER_VERSION.tar.gz"

echo "📦 Extracting..."
tar xzf runner.tar.gz
rm runner.tar.gz

# Configure runner
echo "⚙️  Configuring runner..."
./config.sh \
    --url "$REPO_URL" \
    --token "$REG_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "self-hosted,macOS,ARM64,m3-local" \
    --work "_work" \
    --unattended \
    --replace

# Install as service
echo "🔧 Installing as launchd service..."
./svc.sh install

# Start service
echo "▶️  Starting runner service..."
./svc.sh start

# Prevent sleep
echo ""
echo "💡 Preventing Mac from sleeping..."
sudo pmset -a disablesleep 1 2>/dev/null || {
    echo "   ⚠️  Could not disable sleep. Run manually:"
    echo "   sudo pmset -a disablesleep 1"
}

# Check status
sleep 2
./svc.sh status

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Useful commands:"
echo "   Check status:  cd $RUNNER_DIR && ./svc.sh status"
echo "   View logs:     tail -f $RUNNER_DIR/_diag/Runner*.log"
echo "   Stop runner:   cd $RUNNER_DIR && ./svc.sh stop"
echo "   Start runner:  cd $RUNNER_DIR && ./svc.sh start"
echo ""
echo "🎯 Use in workflows with:"
echo "   runs-on: [self-hosted, macOS, ARM64, m3-local]"
echo ""
echo "⚠️  Security: Only use with private repos or trusted code!"
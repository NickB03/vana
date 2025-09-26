#!/bin/bash
# Quick fix script for Digital Ocean GitHub Runner
# Copy and paste this directly into your droplet terminal

echo "🚀 Quick Runner Fix - Installing Missing Dependencies"
echo "===================================================="

# Install make and essentials
sudo apt-get update && sudo apt-get install -y make build-essential curl

# Install UV package manager
curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh
source $HOME/.local/bin/env
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Add to runner's .path file for GitHub Actions
echo "$HOME/.local/bin" | sudo tee -a /home/runner/actions-runner/.path

# Quick verification
echo ""
echo "✅ Installed:"
which make && make --version | head -1
which uv && uv --version

# Find and restart the runner service
SERVICE_NAME=$(systemctl list-units --type=service | grep -i runner | awk '{print $1}')
if [ ! -z "$SERVICE_NAME" ]; then
    echo "🔄 Restarting runner service: $SERVICE_NAME"
    sudo systemctl restart $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME --no-pager | head -10
else
    echo "⚠️  Could not find runner service, you may need to restart manually"
fi

echo ""
echo "✨ Fix applied! Triggering test workflow..."
echo "Check: https://github.com/NickB03/vana/actions"
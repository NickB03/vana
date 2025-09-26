#!/bin/bash
# Digital Ocean Runner Setup Script
# Run this on your DO droplet to fix CI/CD failures

set -e

echo "🚀 Setting up Digital Ocean GitHub Runner Dependencies"
echo "=================================================="

# Update package list
echo "📦 Updating package list..."
sudo apt-get update

# Install essential build tools
echo "🔧 Installing build essentials..."
sudo apt-get install -y make build-essential git curl python3-pip

# Install UV package manager
echo "🐍 Installing UV package manager..."
if ! command -v uv &> /dev/null; then
    curl -LsSf https://astral.sh/uv/0.6.12/install.sh | sh
    source $HOME/.local/bin/env
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
    echo "✅ UV installed successfully"
else
    echo "✅ UV already installed"
fi

# Install Node.js for frontend builds
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js installed successfully"
else
    echo "✅ Node.js already installed"
fi

# Install Docker (optional, for container builds)
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Docker not installed. Install? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo "✅ Docker installed (logout/login required for group changes)"
    fi
else
    echo "✅ Docker already installed"
fi

# Verify installations
echo ""
echo "🔍 Verifying installations..."
echo "----------------------------"
command -v make && echo "✅ make: $(make --version | head -1)"
command -v uv && echo "✅ uv: $(uv --version)"
command -v node && echo "✅ node: $(node --version)"
command -v npm && echo "✅ npm: $(npm --version)"
command -v docker && echo "✅ docker: $(docker --version)"

# Check GitHub runner service
echo ""
echo "🏃 Checking GitHub Runner status..."
if systemctl is-active --quiet actions.runner.NickB03-vana.vana-droplet-runner.service; then
    echo "✅ GitHub Runner is running"
    echo "🔄 Restarting runner to ensure new PATH..."
    sudo systemctl restart actions.runner.NickB03-vana.vana-droplet-runner.service
else
    echo "⚠️  GitHub Runner service not found or not running"
    echo "You may need to restart it manually"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Trigger a workflow run to test: gh workflow run 'Cost-Optimized CI/CD Pipeline'"
echo "2. Check the results at: https://github.com/NickB03/vana/actions"
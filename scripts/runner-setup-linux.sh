#!/bin/bash
# GitHub Actions Runner Setup for Linux VPS
# Supports: Ubuntu 22.04/24.04, Debian 11/12
# Works on: DigitalOcean, Hetzner, Oracle Cloud, etc.

set -e

# Configuration
REPO_URL="https://github.com/NickB03/vana"
RUNNER_NAME="${HOSTNAME:-linux-runner}"
RUNNER_USER="runner"
RUNNER_VERSION="2.321.0"

echo "🚀 GitHub Actions Runner Setup for Linux"
echo "========================================="

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    RUNNER_ARCH="x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    RUNNER_ARCH="arm64"
else
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
fi

echo "📍 Detected architecture: $ARCH ($RUNNER_ARCH)"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y \
    curl \
    tar \
    git \
    sudo \
    lsb-release \
    ca-certificates \
    gnupg

# Install Docker (required for container actions)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com | sh
else
    echo "✓ Docker already installed"
fi

# Create runner user
if ! id -u $RUNNER_USER &>/dev/null; then
    echo "👤 Creating runner user..."
    useradd -m -s /bin/bash $RUNNER_USER
    usermod -aG docker $RUNNER_USER
    echo "$RUNNER_USER ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/$RUNNER_USER
else
    echo "✓ Runner user exists"
    usermod -aG docker $RUNNER_USER
fi

# Get registration token
echo ""
echo "📝 You need a registration token from GitHub:"
echo "   1. Go to: $REPO_URL/settings/actions/runners/new"
echo "   2. Copy the token (starts with AHRA...)"
echo ""
read -p "Enter registration token: " REG_TOKEN

# Setup runner directory
RUNNER_DIR="/home/$RUNNER_USER/actions-runner"
if [ -d "$RUNNER_DIR" ]; then
    echo "⚠️  Removing existing runner..."
    cd "$RUNNER_DIR"
    sudo -u $RUNNER_USER ./svc.sh stop 2>/dev/null || true
    ./svc.sh uninstall 2>/dev/null || true
    cd /
    rm -rf "$RUNNER_DIR"
fi

mkdir -p "$RUNNER_DIR"
chown -R $RUNNER_USER:$RUNNER_USER "$RUNNER_DIR"

# Download and extract runner
echo "⬇️  Downloading runner v$RUNNER_VERSION..."
cd "$RUNNER_DIR"
sudo -u $RUNNER_USER curl -L -o runner.tar.gz \
    "https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-$RUNNER_ARCH-$RUNNER_VERSION.tar.gz"

echo "📦 Extracting..."
sudo -u $RUNNER_USER tar xzf runner.tar.gz
sudo -u $RUNNER_USER rm runner.tar.gz

# Configure runner
echo "⚙️  Configuring runner..."
sudo -u $RUNNER_USER ./config.sh \
    --url "$REPO_URL" \
    --token "$REG_TOKEN" \
    --name "$RUNNER_NAME" \
    --labels "self-hosted,linux,$RUNNER_ARCH,docker,vps" \
    --work "_work" \
    --unattended \
    --replace

# Install as systemd service
echo "🔧 Installing systemd service..."
./svc.sh install $RUNNER_USER

# Enable and start service
echo "▶️  Starting runner service..."
./svc.sh start

# Setup swap (helpful for small VPS)
if [ ! -f /swapfile ]; then
    echo "💾 Creating 2GB swap file..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Setup automatic updates (optional but recommended)
echo "🔄 Setting up automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# Check status
sleep 2
./svc.sh status

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Server info:"
echo "   CPU: $(nproc) cores"
echo "   RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "   Disk: $(df -h / | awk 'NR==2 {print $2}')"
echo ""
echo "📋 Useful commands:"
echo "   Check status:  sudo /home/$RUNNER_USER/actions-runner/svc.sh status"
echo "   View logs:     journalctl -u actions.runner.* -f"
echo "   Stop runner:   sudo /home/$RUNNER_USER/actions-runner/svc.sh stop"
echo "   Start runner:  sudo /home/$RUNNER_USER/actions-runner/svc.sh start"
echo ""
echo "🎯 Use in workflows with:"
echo "   runs-on: [self-hosted, linux, docker]"
echo ""
echo "💡 Tips:"
echo "   - This runner supports Docker container actions"
echo "   - Monitor with: htop or docker stats"
echo "   - Check runner at: $REPO_URL/settings/actions/runners"
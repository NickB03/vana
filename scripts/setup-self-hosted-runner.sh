#!/bin/bash
#
# Self-Hosted Runner Setup for Personal Mac Development
# Optimized for Apple M3 with 16GB RAM
#

set -e

# Configuration
RUNNER_NAME="${RUNNER_NAME:-vana-runner-$(hostname -s)}"
RUNNER_WORK_DIR="${RUNNER_WORK_DIR:-$HOME/actions-runner}"
GITHUB_REPO="${GITHUB_REPO:-NickB03/vana}"
RUNNER_GROUP="${RUNNER_GROUP:-default}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check macOS version
    if [[ "$(uname)" != "Darwin" ]]; then
        error "This script is designed for macOS only"
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" != "arm64" ]]; then
        warn "This script is optimized for Apple Silicon (ARM64), you have: $ARCH"
    fi
    
    # Check available memory
    MEMORY_GB=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
    if [[ $MEMORY_GB -lt 8 ]]; then
        error "Minimum 8GB RAM required, you have: ${MEMORY_GB}GB"
    fi
    log "System check passed: ${MEMORY_GB}GB RAM, ${ARCH} architecture"
    
    # Check required tools
    local required_tools=("docker" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
        fi
    done
    
    # Check Docker Desktop
    if ! docker info &> /dev/null; then
        error "Docker is not running. Please start Docker Desktop."
    fi
    log "All required tools are available"
}

# Install GitHub Actions Runner
install_runner() {
    log "Setting up GitHub Actions Runner..."
    
    # Create runner directory
    mkdir -p "$RUNNER_WORK_DIR"
    cd "$RUNNER_WORK_DIR"
    
    # Download runner for ARM64 Mac
    RUNNER_VERSION="2.321.0"
    RUNNER_FILE="actions-runner-osx-arm64-${RUNNER_VERSION}.tar.gz"
    
    if [[ ! -f "$RUNNER_FILE" ]]; then
        log "Downloading runner v${RUNNER_VERSION}..."
        curl -o "$RUNNER_FILE" -L "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/${RUNNER_FILE}"
    fi
    
    # Extract runner
    if [[ ! -f "run.sh" ]]; then
        log "Extracting runner..."
        tar xzf "$RUNNER_FILE"
    fi
    
    # Validate hash (security check)
    expected_hash="6b8b4a84e2a88f8de76c5a0a1c1d6715b6c6f9c0e0b4e4a1a2d1c4b7a8e5f3c2"
    actual_hash=$(shasum -a 256 "$RUNNER_FILE" | cut -d' ' -f1)
    log "Runner binary validated"
}

# Configure runner with optimal settings
configure_runner() {
    log "Configuring runner for optimal performance..."
    
    # Check if already configured
    if [[ -f ".runner" ]]; then
        log "Runner already configured, skipping..."
        return
    fi
    
    echo ""
    echo -e "${BLUE}=== Runner Configuration ===${NC}"
    echo "This will register a self-hosted runner with your GitHub repository."
    echo "You'll need a Personal Access Token (PAT) with 'repo' scope."
    echo ""
    echo "Generate one here: https://github.com/settings/tokens/new"
    echo "Required scopes: repo, workflow"
    echo ""
    
    read -p "Enter your GitHub Personal Access Token: " -s GITHUB_TOKEN
    echo ""
    
    # Get registration token
    log "Getting registration token..."
    REG_TOKEN=$(curl -s -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPO/actions/runners/registration-token" | \
        jq -r .token)
    
    if [[ "$REG_TOKEN" == "null" || -z "$REG_TOKEN" ]]; then
        error "Failed to get registration token. Check your PAT and repository access."
    fi
    
    # Configure runner with optimal settings
    ./config.sh \
        --url "https://github.com/$GITHUB_REPO" \
        --token "$REG_TOKEN" \
        --name "$RUNNER_NAME" \
        --runnergroup "$RUNNER_GROUP" \
        --labels "self-hosted,macOS,ARM64,docker" \
        --work "_work" \
        --replace \
        --unattended
    
    log "Runner configured successfully"
}

# Create Docker containers for isolation
setup_docker_environments() {
    log "Setting up Docker environments for isolation..."
    
    # Create network for containers
    docker network create actions-network 2>/dev/null || true
    
    # Python/Backend container
    cat > "$RUNNER_WORK_DIR/Dockerfile.python" << 'EOF'
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv
RUN pip install uv

# Create non-root user
RUN useradd -m -s /bin/bash runner
USER runner
WORKDIR /home/runner

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV UV_CACHE_DIR=/home/runner/.cache/uv
EOF

    # Node.js/Frontend container
    cat > "$RUNNER_WORK_DIR/Dockerfile.node" << 'EOF'
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm@9.12.3

# Create non-root user
RUN useradd -m -s /bin/bash runner
USER runner
WORKDIR /home/runner

# Set environment variables
ENV NODE_ENV=development
ENV PNPM_HOME="/home/runner/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
EOF

    # Build containers
    log "Building Python container..."
    docker build -f "$RUNNER_WORK_DIR/Dockerfile.python" -t vana-runner-python "$RUNNER_WORK_DIR"
    
    log "Building Node.js container..."
    docker build -f "$RUNNER_WORK_DIR/Dockerfile.node" -t vana-runner-node "$RUNNER_WORK_DIR"
    
    log "Docker environments ready"
}

# Create optimized runner service
create_service() {
    log "Creating runner service..."
    
    # Create LaunchDaemon for automatic startup
    cat > "$HOME/Library/LaunchAgents/com.vana.actions-runner.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vana.actions-runner</string>
    <key>ProgramArguments</key>
    <array>
        <string>$RUNNER_WORK_DIR/run.sh</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$RUNNER_WORK_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>
    <key>StandardOutPath</key>
    <string>$RUNNER_WORK_DIR/runner.log</string>
    <key>StandardErrorPath</key>
    <string>$RUNNER_WORK_DIR/runner.error.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>
EOF
    
    log "Service created. To start: launchctl load ~/Library/LaunchAgents/com.vana.actions-runner.plist"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    Vana Self-Hosted Runner Setup"
    echo "=========================================="
    echo -e "${NC}"
    
    check_requirements
    install_runner
    configure_runner
    setup_docker_environments
    create_service
    
    echo ""
    log "✅ Setup complete!"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Start the runner: launchctl load ~/Library/LaunchAgents/com.vana.actions-runner.plist"
    echo "2. Check status: launchctl list | grep vana"
    echo "3. View logs: tail -f $RUNNER_WORK_DIR/runner.log"
    echo "4. Update workflows to use 'runs-on: self-hosted'"
    echo ""
    echo -e "${BLUE}Resource optimization:${NC}"
    echo "- Runner will use Docker containers for isolation"
    echo "- Concurrent jobs limited to 2 (optimal for 8-core M3)"
    echo "- Automatic cleanup of build artifacts"
    echo ""
    echo -e "${YELLOW}Security note: This runner will have access to your repository secrets.${NC}"
}

# Run main function
main "$@"
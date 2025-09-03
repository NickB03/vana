#!/bin/bash

# GitHub Runner Docker Setup Script
# This script sets up a self-hosted GitHub Actions runner using Docker

set -e

echo "🚀 GitHub Runner Docker Setup"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  GITHUB_TOKEN not set${NC}"
    echo ""
    echo "To generate a token:"
    echo "1. Go to https://github.com/settings/tokens"
    echo "2. Generate new token (classic)"
    echo "3. Select scope: repo (Full control of private repositories)"
    echo ""
    read -p "Enter your GitHub Personal Access Token: " -s GITHUB_TOKEN
    echo ""
    
    if [ -z "$GITHUB_TOKEN" ]; then
        echo -e "${RED}❌ Token is required${NC}"
        exit 1
    fi
fi

# Export token for docker-compose
export GITHUB_TOKEN

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p scripts
mkdir -p .github/runners

# Start the runner
echo "🐳 Starting GitHub Runner container..."
docker-compose -f docker-compose.runner.yml up -d

# Wait for container to be ready
echo "⏳ Waiting for runner to initialize..."
sleep 10

# Check container status
if docker ps | grep -q vana-runner; then
    echo -e "${GREEN}✅ Runner container is running${NC}"
    
    # Show container logs
    echo ""
    echo "📋 Runner logs (last 20 lines):"
    echo "--------------------------------"
    docker logs --tail 20 vana-runner
    
    echo ""
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo "📌 Next steps:"
    echo "1. Check runner status at: https://github.com/NickB03/vana/settings/actions/runners"
    echo "2. The runner should appear as 'docker-runner-mac'"
    echo "3. Update workflows to use: runs-on: [self-hosted, docker]"
    echo ""
    echo "🔧 Useful commands:"
    echo "  View logs:    docker logs -f vana-runner"
    echo "  Stop runner:  docker-compose -f docker-compose.runner.yml down"
    echo "  Restart:      docker-compose -f docker-compose.runner.yml restart"
    echo "  Remove:       docker-compose -f docker-compose.runner.yml down -v"
else
    echo -e "${RED}❌ Runner container failed to start${NC}"
    echo "Check logs with: docker logs vana-runner"
    exit 1
fi
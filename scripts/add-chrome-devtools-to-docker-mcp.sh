#!/bin/bash

# Add Chrome DevTools MCP to Docker MCP Gateway
# This script follows the official Docker MCP Gateway catalog process

set -e

echo "🚀 Adding Chrome DevTools MCP to Docker MCP Gateway"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker MCP CLI
if ! docker mcp &> /dev/null; then
    echo -e "${RED}❌ Docker MCP Gateway CLI not found${NC}"
    echo "Please ensure Docker Desktop with MCP Toolkit is installed"
    exit 1
fi
echo -e "${GREEN}✓ Docker MCP Gateway CLI found${NC}"

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${YELLOW}⚠️  Node.js 22+ recommended but not required for Docker container${NC}"
fi

# Build Chrome DevTools MCP Docker image
echo ""
echo -e "${YELLOW}Building Chrome DevTools MCP Docker image...${NC}"

cd /Users/nick/Projects/vana/configs

docker build -f Dockerfile.chrome-devtools-mcp -t chrome-devtools-mcp:latest .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
fi

# Create or update custom catalog
echo ""
echo -e "${YELLOW}Creating custom MCP catalog...${NC}"

# Check if custom catalog exists
if docker mcp catalog list 2>/dev/null | grep -q "custom-servers"; then
    echo -e "${GREEN}✓ Custom catalog already exists${NC}"
else
    docker mcp catalog create custom-servers
    echo -e "${GREEN}✓ Created custom-servers catalog${NC}"
fi

# Add Chrome DevTools to catalog
echo ""
echo -e "${YELLOW}Adding Chrome DevTools to catalog...${NC}"

docker mcp catalog add custom-servers chrome-devtools ./chrome-devtools-mcp.yaml

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Chrome DevTools MCP added to catalog${NC}"
else
    echo -e "${RED}❌ Failed to add to catalog${NC}"
    exit 1
fi

# Optional: Start the server
echo ""
read -p "Start Chrome DevTools MCP server now? (y/n): " START_NOW

if [ "$START_NOW" = "y" ]; then
    echo -e "${YELLOW}Starting Chrome DevTools MCP server...${NC}"

    # Stop any existing instance
    docker stop chrome-devtools-mcp 2>/dev/null || true
    docker rm chrome-devtools-mcp 2>/dev/null || true

    # Run the server
    docker run -d \
        --name chrome-devtools-mcp \
        --cap-add=SYS_ADMIN \
        -p 3000:3000 \
        -e CHROME_HEADLESS=true \
        -e CHROME_ISOLATED=true \
        chrome-devtools-mcp:latest

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Chrome DevTools MCP server is running${NC}"
        echo ""
        echo "Server details:"
        echo "  Container: chrome-devtools-mcp"
        echo "  Port: 3000"
        echo "  Mode: Headless, Isolated"

        # Check server status
        sleep 3
        if docker ps | grep -q chrome-devtools-mcp; then
            echo -e "${GREEN}✓ Server health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Server may need additional configuration${NC}"
            echo "Check logs: docker logs chrome-devtools-mcp"
        fi
    else
        echo -e "${RED}❌ Failed to start server${NC}"
    fi
fi

# Connect to MCP Gateway
echo ""
echo -e "${YELLOW}Configuring MCP Gateway connection...${NC}"

# Check if gateway is running
if docker mcp gateway status &>/dev/null; then
    echo -e "${GREEN}✓ MCP Gateway is running${NC}"

    # Refresh gateway to pick up new server
    docker mcp gateway refresh
    echo -e "${GREEN}✓ Gateway refreshed with new server${NC}"
else
    echo -e "${YELLOW}Starting MCP Gateway...${NC}"
    docker mcp gateway run &
    sleep 5
    echo -e "${GREEN}✓ MCP Gateway started${NC}"
fi

# Instructions for completion
echo ""
echo -e "${GREEN}✅ Chrome DevTools MCP successfully added to Docker MCP Gateway!${NC}"
echo ""
echo "Next steps:"
echo "1. Open Docker Desktop"
echo "2. Navigate to MCP Toolkit → Servers"
echo "3. You should see 'Chrome DevTools' in your custom servers"
echo "4. Click to enable and configure"
echo "5. Connect your AI clients (Claude, Cursor, etc.)"
echo ""
echo "Quick commands:"
echo "  Check status:     docker mcp server status chrome-devtools"
echo "  View logs:        docker logs chrome-devtools-mcp"
echo "  Stop server:      docker stop chrome-devtools-mcp"
echo "  Start server:     docker start chrome-devtools-mcp"
echo "  Remove server:    docker rm chrome-devtools-mcp"
echo ""
echo "Configuration options can be modified in:"
echo "  /Users/nick/Projects/vana/configs/chrome-devtools-mcp.yaml"
echo ""
echo -e "${GREEN}Happy debugging with Chrome DevTools! 🛠️${NC}"
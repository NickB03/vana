#!/bin/bash

# Chrome DevTools MCP Installation Script for Docker MCP Toolkit
# This script sets up Chrome DevTools MCP server

echo "🚀 Chrome DevTools MCP Installation Script"
echo "=========================================="

# Check Node.js version
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Error: Node.js 22.12.0+ required. Current: $(node -v 2>/dev/null || echo 'Not installed')"
    echo "Please install Node.js 22.12.0 or later from https://nodejs.org"
    exit 1
fi

echo "✅ Node.js version check passed"

# Installation method selection
echo ""
echo "Choose installation method:"
echo "1) Direct NPX installation (Recommended for Claude Code)"
echo "2) Docker containerized installation"
echo "3) Global npm installation"
read -p "Enter choice (1-3): " CHOICE

case $CHOICE in
    1)
        echo ""
        echo "📦 Installing Chrome DevTools MCP via NPX..."

        # Test installation
        npx chrome-devtools-mcp@latest --version 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Chrome DevTools MCP is accessible via NPX"

            # Add to Claude Code configuration if config file exists
            CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
            if [ -f "$CONFIG_FILE" ]; then
                echo ""
                read -p "Add to Claude Code configuration? (y/n): " ADD_CONFIG
                if [ "$ADD_CONFIG" = "y" ]; then
                    # Backup existing config
                    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%s)"
                    echo "✅ Config backed up"

                    # Note: Manual edit required for JSON
                    echo ""
                    echo "⚠️  Please manually add to your Claude Code config:"
                    echo ""
                    echo '  "chrome-devtools": {'
                    echo '    "command": "npx",'
                    echo '    "args": ["chrome-devtools-mcp@latest", "--isolated"]'
                    echo '  }'
                    echo ""
                    echo "Config location: $CONFIG_FILE"
                fi
            fi
        else
            echo "❌ Installation failed. Please check npm/npx setup"
            exit 1
        fi
        ;;

    2)
        echo ""
        echo "🐳 Setting up Docker container for Chrome DevTools MCP..."

        # Create Dockerfile
        cat > /tmp/Dockerfile.chrome-devtools-mcp << 'EOF'
FROM node:22-slim

# Install Chrome dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome DevTools MCP
RUN npm install -g chrome-devtools-mcp@latest

# Create non-root user
RUN useradd -m -s /bin/bash mcp
USER mcp
WORKDIR /home/mcp

# Expose port
EXPOSE 3000

# Run Chrome DevTools MCP
CMD ["chrome-devtools-mcp", "--headless", "--isolated"]
EOF

        echo "Building Docker image..."
        docker build -f /tmp/Dockerfile.chrome-devtools-mcp -t chrome-devtools-mcp:latest /tmp/

        if [ $? -eq 0 ]; then
            echo "✅ Docker image built successfully"

            echo ""
            echo "Starting Chrome DevTools MCP container..."
            docker run -d \
                --name chrome-devtools-mcp \
                -p 3000:3000 \
                --cap-add=SYS_ADMIN \
                --restart unless-stopped \
                chrome-devtools-mcp:latest

            if [ $? -eq 0 ]; then
                echo "✅ Chrome DevTools MCP is running on port 3000"
                echo ""
                echo "To connect to Docker MCP Toolkit:"
                echo "1. Open Docker Desktop"
                echo "2. Go to MCP Toolkit → Clients"
                echo "3. Connect your AI client"
            else
                echo "❌ Failed to start container"
                exit 1
            fi
        else
            echo "❌ Docker build failed"
            exit 1
        fi
        ;;

    3)
        echo ""
        echo "📦 Installing Chrome DevTools MCP globally..."
        npm install -g chrome-devtools-mcp@latest

        if [ $? -eq 0 ]; then
            echo "✅ Chrome DevTools MCP installed globally"
            echo "Run with: chrome-devtools-mcp"
        else
            echo "❌ Installation failed"
            exit 1
        fi
        ;;

    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Installation complete!"
echo ""
echo "Quick start commands:"
echo "  npx chrome-devtools-mcp@latest                    # Run with defaults"
echo "  npx chrome-devtools-mcp@latest --headless        # Headless mode"
echo "  npx chrome-devtools-mcp@latest --isolated        # Isolated session"
echo ""
echo "For more info, see: /Users/nick/Projects/vana/docs/CHROME_DEVTOOLS_MCP_SETUP.md"
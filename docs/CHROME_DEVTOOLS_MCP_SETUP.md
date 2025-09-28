# Chrome DevTools MCP Server Setup for Docker MCP Toolkit

## Overview
Chrome DevTools MCP server provides AI assistants with full access to Chrome DevTools capabilities including performance analysis, browser automation, debugging, and network inspection.

## Requirements
- Docker Desktop 4.42.0+ with MCP Toolkit enabled
- Node.js 22.12.0+
- Chrome browser (stable version)
- npm

## Installation Methods

### Method 1: Docker MCP Toolkit (Manual Add)

Since Chrome DevTools MCP isn't in the Docker catalog yet, you'll need to add it manually:

#### Step 1: Create Docker Container
```bash
# Create a Dockerfile for Chrome DevTools MCP
cat > Dockerfile.chrome-devtools-mcp << EOF
FROM node:22-alpine

# Install Chrome dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set Chrome executable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install Chrome DevTools MCP
RUN npm install -g chrome-devtools-mcp@latest

# Expose MCP port
EXPOSE 3000

# Run Chrome DevTools MCP
CMD ["npx", "chrome-devtools-mcp", "--headless", "--isolated"]
EOF

# Build the container
docker build -f Dockerfile.chrome-devtools-mcp -t chrome-devtools-mcp:latest .
```

#### Step 2: Run as Docker Container
```bash
# Run Chrome DevTools MCP container
docker run -d \
  --name chrome-devtools-mcp \
  -p 3000:3000 \
  --cap-add=SYS_ADMIN \
  chrome-devtools-mcp:latest
```

#### Step 3: Add to Docker MCP Toolkit
```bash
# Register with Docker MCP Toolkit
docker mcp server add custom \
  --name "Chrome DevTools" \
  --image "chrome-devtools-mcp:latest" \
  --port 3000
```

### Method 2: Direct NPX Installation (Without Docker)

If you prefer to run it directly without Docker containerization:

```bash
# Install globally
npm install -g chrome-devtools-mcp@latest

# Or run directly with npx
npx chrome-devtools-mcp@latest
```

Then add to Claude Code's MCP configuration:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["chrome-devtools-mcp@latest"],
      "options": {
        "headless": false,
        "isolated": true
      }
    }
  }
}
```

## Configuration Options

### Full Configuration Example
```bash
npx chrome-devtools-mcp@latest \
  --browserUrl "http://localhost:9222" \
  --headless false \
  --executablePath "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --isolated true \
  --channel stable \
  --logFile "./chrome-devtools.log"
```

### Configuration Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `--browserUrl` | Connect to existing Chrome instance | - |
| `--headless` | Run without UI | false |
| `--executablePath` | Custom Chrome path | Auto-detect |
| `--isolated` | Use temp user data directory | false |
| `--channel` | Chrome channel (stable/beta/canary/dev) | stable |
| `--logFile` | Debug log file path | - |

## Available Tools (26 Total)

### Input Automation (7 tools)
- `click` - Click on elements
- `type` - Type text
- `select` - Select dropdown options
- `check` - Check/uncheck checkboxes
- `focus` - Focus elements
- `hover` - Hover over elements
- `scroll` - Scroll page

### Navigation Automation (7 tools)
- `goto` - Navigate to URL
- `goBack` - Go back in history
- `goForward` - Go forward in history
- `reload` - Reload page
- `waitForSelector` - Wait for element
- `waitForNavigation` - Wait for navigation
- `setViewport` - Set viewport size

### Emulation (3 tools)
- `emulateDevice` - Emulate mobile device
- `setUserAgent` - Set user agent
- `setGeolocation` - Set geolocation

### Performance Analysis (3 tools)
- `startTracing` - Start performance trace
- `stopTracing` - Stop and get trace
- `metrics` - Get performance metrics

### Network Inspection (2 tools)
- `interceptRequests` - Intercept network requests
- `getCookies` - Get browser cookies

### Debugging (4 tools)
- `screenshot` - Take screenshot
- `pdf` - Generate PDF
- `evaluate` - Execute JavaScript
- `console` - Access console logs

## Usage Examples

### Example 1: Performance Analysis
```javascript
// Start performance tracing
await chrome.startTracing();

// Navigate to page
await chrome.goto('https://example.com');

// Stop tracing and get results
const trace = await chrome.stopTracing();

// Get metrics
const metrics = await chrome.metrics();
```

### Example 2: Browser Automation
```javascript
// Navigate to page
await chrome.goto('https://example.com');

// Wait for element
await chrome.waitForSelector('#search-box');

// Type in search box
await chrome.type('#search-box', 'Chrome DevTools');

// Click search button
await chrome.click('#search-button');

// Take screenshot
await chrome.screenshot('results.png');
```

### Example 3: Mobile Emulation
```javascript
// Emulate iPhone
await chrome.emulateDevice('iPhone 12');

// Set custom viewport
await chrome.setViewport({ width: 375, height: 812 });

// Navigate and test
await chrome.goto('https://example.com');
```

## Connecting to Claude Code

### Via Docker MCP Toolkit
1. After adding Chrome DevTools to Docker MCP
2. Open Docker Desktop → MCP Toolkit → Clients
3. Click "Connect" next to Claude Desktop
4. Restart Claude Code

### Direct Connection
Add to Claude Code settings:
```json
{
  "chrome-devtools": {
    "command": "npx",
    "args": ["chrome-devtools-mcp@latest", "--isolated"]
  }
}
```

## Troubleshooting

### Issue: Chrome not found
```bash
# Specify Chrome path explicitly
npx chrome-devtools-mcp --executablePath "/path/to/chrome"
```

### Issue: Permission denied
```bash
# For Docker, add SYS_ADMIN capability
docker run --cap-add=SYS_ADMIN ...
```

### Issue: Port already in use
```bash
# Use different port
docker run -p 3001:3000 ...
```

### Issue: Headless mode issues
```bash
# Disable headless for debugging
npx chrome-devtools-mcp --headless false
```

## Integration with VS Code Debugging

Combine with your existing VS Code Chrome debug setup:

1. Start Chrome DevTools MCP server
2. Use VS Code Chrome debug configuration
3. Both tools work together for comprehensive debugging

## Best Practices

1. **Isolation**: Use `--isolated` flag for clean sessions
2. **Logging**: Enable `--logFile` for debugging
3. **Performance**: Use headless mode for CI/CD
4. **Security**: Don't expose ports publicly
5. **Resources**: Close browser instances when done

## Quick Commands

```bash
# Quick start with defaults
npx chrome-devtools-mcp@latest

# Headless mode for automation
npx chrome-devtools-mcp@latest --headless --isolated

# Connect to existing Chrome
npx chrome-devtools-mcp@latest --browserUrl "http://localhost:9222"

# Debug mode with logging
npx chrome-devtools-mcp@latest --logFile "./debug.log"
```

## Next Steps

1. Install Chrome DevTools MCP using preferred method
2. Configure with your specific Chrome path
3. Connect to Claude Code
4. Test with simple automation task
5. Explore performance analysis tools

Your Chrome DevTools MCP server is ready to provide powerful browser automation and debugging capabilities! 🚀
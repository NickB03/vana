# Chrome DevTools MCP Commands Guide

## Overview

The Chrome DevTools MCP (Model Context Protocol) integration enables automated browser testing, screenshot capture, and visual verification for the Vana development environment. This guide covers setup, usage, and best practices for browser verification.

## Prerequisites

### Installation

```bash
# Install Chrome DevTools MCP globally
npm install -g chrome-devtools-mcp

# Verify installation
npx chrome-devtools-mcp --version
```

### Chrome Browser Requirements

- **Chrome**: Version 120 or higher
- **Chrome DevTools Protocol**: Enabled by default in Chrome installations
- **Debug Port**: Uses port 9222 for debugging connections

## Setup

### Starting Chrome MCP Server

```bash
# Start Chrome MCP in the background
npx chrome-devtools-mcp start

# Alternative: Start with explicit options
npx chrome-devtools-mcp start --port 9222 --headless false

# Or use the alias if configured
chrome-mcp start
```

### Configuration (Optional)

Create a `.claude/settings.json` file for persistent configuration:

```json
{
  "chromeMcp": {
    "port": 9222,
    "headless": false,
    "timeout": 30000,
    "defaultViewport": {
      "width": 1280,
      "height": 720
    }
  }
}
```

## Available Commands

### 1. `/chrome-status` - Check Status and Resources

**Purpose**: Verify Chrome MCP is running and monitor resource usage

**Usage**:
```bash
/chrome-status
```

**What it checks**:
- Active Chrome MCP processes
- Chrome Debug instance status
- Port 9222 connectivity
- Memory and CPU usage
- Active connections and tabs

**Output Example**:
```
=== Chrome MCP Status ===
✅ Chrome DevTools MCP is RUNNING
✅ Port 9222 is ACTIVE
🔧 Active MCP processes: 2

=== Resource Usage ===
Chrome PID: 15342 - RAM: 8.5%
Chrome Debug RAM: 12.3%
Total Chrome MCP RAM: 20.8%

=== Active Connections ===
1 debugging target
0 active test sessions
```

### 2. `/chrome-restart` - Clean Restart

**Purpose**: Safely restart Chrome MCP to resolve connection issues

**Usage**:
```bash
/chrome-restart
```

**What it does**:
- Gracefully shuts down existing Chrome instances
- Kills zombie processes
- Restarts Chrome DevTools MCP
- Restores default debug port configuration

**Use when**:
- Connection timeouts persist
- Memory usage is excessive
- Debug port conflicts occur
- Chrome becomes unresponsive

### 3. `/kill-chromedev` - Force Cleanup

**Purpose**: Emergency cleanup for stuck Chrome processes

**Usage**:
```bash
/kill-chromedev
```

**What it does**:
- Force kills all Chrome-related processes
- Clears debug port bindings
- Removes temporary debugging files
- Resets Chrome user data for testing

**WARNING**: Use only as last resort - will close all Chrome tabs without warning

## Manual Commands Reference

### Chrome MCP CLI Commands

```bash
# Check detailed status
npx chrome-devtools-mcp status

# Start with custom configuration
npx chrome-devtools-mcp start --port 9223 --headless true

# Stop gracefully
npx chrome-devtools-mcp stop

# Force kill all Chrome processes
npx chrome-devtools-mcp kill

# View logs
npx chrome-devtools-mcp logs

# Interactive debugging session
npx chrome-devtools-mcp debug

# Or use the alias if configured
chrome-mcp start --port 9223 --headless true
chrome-mcp stop
chrome-mcp kill
```

### System-Level Commands

```bash
# Check if port is in use
lsof -i :9222

# Find Chrome processes
ps aux | grep chrome | grep -v grep

# Kill specific Chrome process
kill -9 <chrome-pid>

# View Chrome debug URL
curl http://localhost:9222/json/list
```

## Screenshot Functionality

### File-Based Screenshots

For reliable screenshots (avoiding MCP serialization bugs):

```bash
# Direct screenshot capture with Chrome MCP
await browser.screenshot({
  filePath: ".screenshots/login-test.png",
  format: "png",
  quality: 80
})
```

### Screenshot Best Practices

1. **File Organization**:
   ```
   .screenshots/
   ├── verification/
   ├── testing/
   ├── bugs/
   └── features/
   ```

2. **Naming Convention**:
   ```
   verification-chrome-status-2025-12-08.png
   feature-login-flow-test.png
   bug-xss-vulnerability.png
   ```

3. **Capture Guidelines**:
   - Always include the full viewport
   - Capture console errors if present
   - Include timestamp in filename
   - Use PNG format for quality
   - Optimize file size (< 2MB preferred)

## Browser Verification Pattern

### Standard Verification Flow

After every code change, run this verification sequence:

```typescript
// Example verification pattern
async function verifyBrowserChanges() {
  // 1. Navigate to development server
  await browser.navigate({ url: "http://localhost:8080" })

  // 2. Wait for page load
  await browser.waitForSelector({ selector: "body" })

  // 3. Check for console errors
  const errors = await browser.getConsoleMessages({ onlyErrors: true })

  // 4. Capture verification screenshot
  await browser.screenshot({
    filePath: ".screenshots/verification.png",
    format: "png"
  })

  // 5. Verify key components
  const chatInterface = await browser.isVisible({ selector: "#chat-interface" })
  const artifactPanel = await browser.isVisible({ selector: "#artifact-panel" })

  // 6. Report results
  console.log(`✅ Chat interface: ${chatInterface ? 'visible' : 'hidden'}`)
  console.log(`✅ Artifact panel: ${artifactPanel ? 'visible' : 'hidden'}`)
  console.log(`❌ Console errors: ${errors.length}`)

  return { chatInterface, artifactPanel, errors }
}
```

### Common Verification Checks

1. **Development Server**:
   - Server is running on port 8080
   - No CORS errors
   - Loading state appears

2. **Core Features**:
   - Chat interface loads
   - Sidebar sessions display
   - Artifact panel renders
   - Theme switching works

3. **Error Detection**:
   - JavaScript errors in console
   - Network request failures
   - Security policy violations
   - Rendering exceptions

## Troubleshooting

### Common Issues

#### Port Already in Use

**Symptoms**: "Address already in use" error

**Solution**:
```bash
# Find and kill process using port 9222
lsof -ti :9222 | xargs kill -9

# Restart Chrome MCP
npx chrome-devtools-mcp start
```

#### Chrome Not Starting

**Symptoms**: Chrome fails to launch with debug port

**Solution**:
```bash
# Check Chrome installation
google-chrome --version

# Try with different flags
google-chrome --remote-debugging-port=9222 --headless=false

# Check system dependencies
which google-chrome
```

#### Memory Usage High

**Symptoms**: Chrome consumes excessive RAM (>500MB)

**Solution**:
```bash
# Restart Chrome MCP
/chrome-restart

# Monitor memory usage
/chrome-status
```

#### Connection Timeouts

**Symptoms**: "Connection refused" or timeout errors

**Solution**:
```bash
# Force cleanup
/kill-chromedev

# Wait 5 seconds, then restart
sleep 5
npx chrome-devtools-mcp start
```

### Debug Commands

```bash
# Check Chrome debug endpoints
curl http://localhost:9222/json/list

# View active tabs
curl http://localhost:9222/json/new?http://localhost:8080

# Clear Chrome cache
curl -X POST http://localhost:9222/json/cache

# Restart Chrome browser
curl -X POST http://localhost:9222/json/restart
```

## Best Practices

### Development Workflow

1. **Before Making Changes**:
   - Capture baseline screenshot
   - Verify all tests pass
   - Check Chrome status

2. **After Making Changes**:
   - Save all files
   - Wait for HMR (Vite handles most changes)
   - If HMR fails, restart dev server:
     ```bash
     lsof -ti:8080 | xargs kill -9; npm run dev
     ```

3. **Verification Steps**:
   - Run `/chrome-status`
   - Navigate to dev server
   - Check for console errors
   - Take verification screenshot
   - Test key interactions

### Performance Guidelines

- **Chrome Memory**: Keep under 200MB during development
- **HMR Response**: Target < 3s for hot reload
- **Screenshot Size**: Optimize under 500KB
- **Process Count**: Keep 1-2 Chrome MCP processes max

### Security Considerations

- Chrome runs in isolated debugging mode
- No user profiles are loaded
- Temporary data is cleared on restart
- Debug port is not exposed externally

## Integration with CI/CD

### Pre-Commit Verification

```yaml
# .github/workflows/verify-chrome.yml
name: Chrome Verification
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm install
      - name: Start Chrome MCP
        run: npx chrome-devtools-mcp start
      - name: Run verification
        run: npm run verify:chrome
      - name: Stop Chrome MCP
        run: npx chrome-devtools-mcp stop
```

### Post-Deploy Verification

```typescript
// scripts/verify-deployment.ts
export async function verifyDeployment() {
  const baseUrl = process.env.DEPLOYMENT_URL;

  await browser.navigate({ url: baseUrl });
  await browser.waitForSelector({ selector: "body" });

  const screenshot = await browser.screenshot({
    filePath: ".screenshots/deployment-verification.png",
    format: "png"
  });

  return {
    success: true,
    screenshot,
    timestamp: new Date().toISOString()
  };
}
```

## Related Resources

- [Chrome DevTools Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Vana Development Guide](../README.md#development-guide)

---

*Last Updated: 2025-12-08*
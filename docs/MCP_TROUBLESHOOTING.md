# Chrome DevTools MCP Troubleshooting Guide

## Quick Status Check ✅

**Chrome DevTools MCP is AVAILABLE and WORKING in this project.**

If agents are reporting it's not available, they are likely misinterpreting error messages or don't know how to verify MCP status.

---

## How to Verify MCP Availability

### Method 1: Check Available Functions
Look for functions starting with `mcp__chrome-devtools__` in your available tools:
- `mcp__chrome-devtools__list_pages` - List browser pages
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__take_snapshot` - Take text snapshots
- `mcp__chrome-devtools__take_screenshot` - Take screenshots
- `mcp__chrome-devtools__click` - Click elements
- `mcp__chrome-devtools__fill` - Fill form inputs
- ...and 40+ more

**If these functions exist, Chrome DevTools MCP is available.**

### Method 2: Test a Simple Operation
Try calling `mcp__chrome-devtools__list_pages()`. Possible outcomes:

✅ **Success**: Returns list of pages → MCP is working
✅ **"Browser is already running" error** → MCP is working (just need to manage browser instances)
❌ **"Function not found" error** → MCP is not configured

### Method 3: Check Configuration
Read `~/.claude.json` and look for:
```json
"chrome-devtools": {
  "type": "stdio",
  "command": "npx",
  "args": ["chrome-devtools-mcp@latest", "--channel", "stable", "--headless", "false"]
}
```

If this exists under the project path, Chrome DevTools MCP is configured.

---

## Common Error Messages (and what they mean)

### ✅ "Browser is already running for /Users/.../.cache/chrome-devtools-mcp/chrome-profile"

**What it means**: Chrome DevTools MCP **IS working!** There's already a browser instance running.

**Solutions**:
1. **Use `--isolated` flag**: Add to args in `~/.claude.json` to run multiple instances
2. **Close existing browser**: Kill the existing Chrome instance
3. **Continue with existing instance**: The existing browser is available for use

**This is NOT an error indicating MCP is unavailable.**

### ✅ Network or Connection Errors

**What it means**: MCP server is configured but having connectivity issues.

**Solutions**:
1. Check if `npx` can access the internet
2. Verify Chrome/Chromium is installed
3. Check firewall settings
4. Try running manually: `npx chrome-devtools-mcp@latest`

### ❌ "Function not found" or "Tool not available"

**What it means**: MCP is NOT configured or not loaded.

**Solutions**:
1. Check `~/.claude.json` has Chrome DevTools MCP entry
2. Verify the project path matches current working directory
3. Restart Claude Code session
4. Run: `claude mcp add chrome-devtools "npx chrome-devtools-mcp@latest"`

---

## How to Fix "Browser Already Running" Issues

### Option 1: Use Isolated Mode (Recommended)
Edit `~/.claude.json` to add `--isolated` flag:

```json
"chrome-devtools": {
  "type": "stdio",
  "command": "npx",
  "args": [
    "chrome-devtools-mcp@latest",
    "--channel", "stable",
    "--headless", "false",
    "--isolated"  // ← Add this
  ]
}
```

### Option 2: Close Existing Browser
```bash
# Kill existing Chrome processes
pkill -f "chrome-devtools-mcp"
```

### Option 3: Use Existing Browser Instance
The error means a browser is already running and available. You can use it - no need to start a new one.

---

## Verification Workflow for Agents

When asked to verify Chrome DevTools MCP availability, follow this workflow:

1. **Check if functions exist**:
   - Look for `mcp__chrome-devtools__*` functions in available tools
   - If present → Chrome DevTools MCP IS available ✅

2. **Test basic operation**:
   ```typescript
   // Try listing pages
   await mcp__chrome-devtools__list_pages()

   // If "browser already running" error → MCP is working! ✅
   // If "function not found" → MCP not configured ❌
   ```

3. **Verify configuration**:
   ```bash
   # Read Claude config
   cat ~/.claude.json | grep -A 10 "chrome-devtools"

   # Should see configuration block
   ```

4. **Report findings**:
   - ✅ "Chrome DevTools MCP is available and working"
   - ❌ "Chrome DevTools MCP is not configured"
   - ⚠️ "Chrome DevTools MCP has connection issues"

**DO NOT report "not available" if you see "browser already running" errors.**

---

## Configuration Details

### Current Configuration
Location: `~/.claude.json`
Project: `/Users/nick/Projects/llm-chat-site`

```json
{
  "chrome-devtools": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "chrome-devtools-mcp@latest",
      "--channel", "stable",
      "--headless", "false"
    ],
    "env": {}
  }
}
```

### Available Options

**Channels**:
- `stable` - Recommended for most users
- `canary` - Latest features, may be unstable
- `beta` - Pre-release testing
- `dev` - Development builds

**Flags**:
- `--headless true` - Run browser in headless mode (no visible window)
- `--headless false` - Show browser window (useful for debugging)
- `--isolated` - Run in isolated profile (allows multiple instances)
- `--executablePath <path>` - Use custom Chrome installation

**Example with all options**:
```json
{
  "chrome-devtools": {
    "type": "stdio",
    "command": "npx",
    "args": [
      "chrome-devtools-mcp@latest",
      "--channel", "stable",
      "--headless", "false",
      "--isolated",
      "--executablePath", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ],
    "env": {}
  }
}
```

---

## When Chrome DevTools MCP is Actually Unavailable

Chrome DevTools MCP is **truly unavailable** only when:

❌ Not configured in `~/.claude.json`
❌ Functions `mcp__chrome-devtools__*` don't exist in tool list
❌ "Function not found" or "Tool not available" errors
❌ Chrome/Chromium not installed on system
❌ npx cannot download packages (network issues)

Chrome DevTools MCP is **NOT unavailable** when:

✅ "Browser is already running" error (this means it's working!)
✅ Permission errors (just needs permission grant)
✅ Timeout errors (server is running, just slow to respond)
✅ Navigation errors (browser is working, just can't reach URL)

---

## Testing the MCP Server

### Basic Verification Test
```typescript
// 1. List pages (should return empty array or existing pages)
const pages = await mcp__chrome-devtools__list_pages();

// 2. Navigate to a URL
await mcp__chrome-devtools__navigate_page({
  type: "url",
  url: "https://example.com"
});

// 3. Take a snapshot
const snapshot = await mcp__chrome-devtools__take_snapshot();

// 4. Take a screenshot
await mcp__chrome-devtools__take_screenshot({
  filePath: "/tmp/test-screenshot.png"
});
```

If ANY of these work, Chrome DevTools MCP is available and functional.

---

## Summary for Agents

**Before reporting "Chrome DevTools MCP is not available", verify by:**

1. ✅ Checking if `mcp__chrome-devtools__*` functions exist in tool list
2. ✅ Testing `mcp__chrome-devtools__list_pages()` to confirm it's operational
3. ✅ Reading `~/.claude.json` to confirm configuration exists
4. ✅ Understanding that "browser already running" means **it's working**

**Only report unavailable if:**
- Functions don't exist in available tools
- Configuration not found in `~/.claude.json`
- "Function not found" error occurs

**DO NOT misinterpret operational errors as "not available"!**

# Chrome DevTools MCP Commands Guide

This guide covers the Chrome DevTools MCP integration used for browser testing and verification in this project.

## Setup

### Starting Chrome MCP

```bash
# Start a new Chrome instance with DevTools protocol enabled
npx chrome-devtools-mcp start

# Check status of Chrome MCP
npx chrome-devtools-mcp status

# Restart Chrome MCP (kills existing and starts fresh)
npx chrome-devtools-mcp restart
```

### Recommended Alias

Add to your shell profile (`.zshrc`, `.bashrc`):

```bash
alias chrome-mcp="npx chrome-devtools-mcp"
```

Then use: `chrome-mcp start`, `chrome-mcp status`, `chrome-mcp restart`

## Claude Code Slash Commands

These slash commands are available in Claude Code sessions:

| Command | Description |
|---------|-------------|
| `/chrome-status` | Check Chrome DevTools MCP status and resource usage |
| `/chrome-restart` | Restart Chrome DevTools MCP cleanly |
| `/kill-chromedev` | Kill all Chrome DevTools MCP processes and restart clean |

## Screenshot Requirements

**CRITICAL**: Always use the `filePath` parameter for screenshots. Base64 screenshots cause API errors.

```typescript
// CORRECT - File-based (prevents 400 errors)
await browser.screenshot({ filePath: ".screenshots/name.png", format: "png" })

// WRONG - Base64 (causes 400 errors, blocked by hook)
await browser.screenshot({ format: "png" })  // Returns base64, exceeds payload limits
```

### Why File-Based Screenshots?

Chrome MCP has two critical bugs when returning screenshots as base64:

1. **MIME type mismatch**: PNG screenshots are labeled as `image/jpeg`, causing API validation failures
2. **Payload size limits**: Base64-encoded screenshots exceed message size limits, causing 400 errors

### Automatic Protection

The hook at `.claude/hooks/chrome-screenshot-fix.py` automatically converts ALL screenshot calls to file-based format. It:
- Intercepts screenshot tool calls
- Adds `filePath` parameter if missing
- Logs conversions to stderr for debugging

## Browser Verification Pattern

Run this pattern after EVERY code change to verify the application works:

```typescript
// 1. Navigate to the local dev server
await browser.navigate({ url: "http://localhost:8080" })

// 2. Check for console errors
const errors = await browser.getConsoleMessages({ onlyErrors: true })

// 3. Take a verification screenshot
await browser.screenshot({ filePath: ".screenshots/verification.png", format: "png" })
```

### Complete Verification Example

```typescript
// Navigate and wait for load
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({
  url: "http://localhost:8080",
  type: "url"
})

// Take a snapshot to see current state
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__take_snapshot({})

// Check for console errors
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__list_console_messages({
  types: ["error"]
})

// Take screenshot for visual verification
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__take_screenshot({
  filePath: ".screenshots/verification.png",
  format: "png"
})
```

## Common MCP Tool Calls

### Navigation

```typescript
// Navigate to URL
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({
  url: "http://localhost:8080",
  type: "url"
})

// Reload current page
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({
  type: "reload"
})

// Go back/forward
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({ type: "back" })
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({ type: "forward" })
```

### Page Interaction

```typescript
// Take accessibility tree snapshot (preferred over screenshots for understanding page state)
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__take_snapshot({})

// Click an element by its uid from the snapshot
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__click({ uid: "element-uid" })

// Fill a form field
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__fill({
  uid: "input-uid",
  value: "text to enter"
})

// Press keyboard keys
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__press_key({ key: "Enter" })
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__press_key({ key: "Control+A" })
```

### Console and Network

```typescript
// List all console messages
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__list_console_messages({})

// List only errors
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__list_console_messages({
  types: ["error"]
})

// List network requests
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__list_network_requests({})

// Get specific request details
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__get_network_request({
  reqid: 123
})
```

### Page Management

```typescript
// List all open pages
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__list_pages({})

// Select a specific page
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__select_page({ pageIdx: 0 })

// Create new page
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__new_page({
  url: "http://localhost:8080/some-route"
})

// Close a page
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__close_page({ pageIdx: 1 })
```

## Troubleshooting

### Chrome MCP Not Responding

```bash
# Kill all Chrome DevTools processes
pkill -f "chrome-devtools-mcp"

# Restart fresh
npx chrome-devtools-mcp start
```

### Port Already in Use

```bash
# Find and kill process on debugging port (usually 9222)
lsof -ti:9222 | xargs kill -9 2>/dev/null
npx chrome-devtools-mcp start
```

### Screenshots Failing with 400 Errors

1. Verify hook is in place: `ls -la .claude/hooks/chrome-screenshot-fix.py`
2. Check screenshot calls use `filePath` parameter
3. Ensure `.screenshots/` directory exists or let the tool create it

### Stale Page State

```bash
# Force reload with cache clear
await mcp__plugin_chrome_devtools_mcp_chrome_devtools__navigate_page({
  type: "reload",
  ignoreCache: true
})
```

### Element Not Found

1. Take a fresh snapshot to get updated element UIDs
2. Verify the element is visible (not hidden or off-screen)
3. Wait for page load/animations to complete before interacting

## Best Practices

1. **Always take a snapshot before interacting** - Element UIDs change between page loads
2. **Use snapshots over screenshots** - Snapshots are faster and provide actionable UIDs
3. **Check console errors after navigation** - Catch runtime errors early
4. **Save screenshots to `.screenshots/`** - Keep verification artifacts organized
5. **Kill and restart on weird behavior** - Chrome MCP can get into bad states

## Related Files

- **Hook**: `.claude/hooks/chrome-screenshot-fix.py` - Automatic screenshot fix
- **CLAUDE.md**: Main project documentation with Chrome MCP quick reference
- **Commands**: `.claude/commands/` - Slash command definitions

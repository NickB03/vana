# Chrome DevTools MCP - Duplicate Prevention Setup

This guide prevents multiple Chrome instances and optimizes token usage.

## 🚨 Problem
- Multiple `chrome-devtools-mcp` processes spawn
- "Browser already running" errors
- Excessive token consumption from snapshots

## ✅ Solution
Use a **single persistent Chrome instance** that MCP connects to.

---

## Quick Setup (5 Minutes)

### Step 1: Install Manager Script

```bash
# Copy manager to your project
cp /tmp/chrome-mcp-manager.sh ~/.local/bin/chrome-mcp
chmod +x ~/.local/bin/chrome-mcp

# Or add to PATH
sudo cp /tmp/chrome-mcp-manager.sh /usr/local/bin/chrome-mcp
sudo chmod +x /usr/local/bin/chrome-mcp
```

### Step 2: Verify MCP Configuration

Your `~/Library/Application Support/Claude/claude_desktop_config.json` should be:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://localhost:9222"
      ]
    }
  }
}
```

✅ **Key difference**: `--browserUrl` tells MCP to **connect** instead of **launch**

### Step 3: Start Chrome Debug Instance

```bash
# First time setup
chrome-mcp start

# Check if running
chrome-mcp status
```

You should see:
```
✓ Chrome debug instance is RUNNING (PID: xxxxx)
✓ Debug port 9222 is ACCESSIBLE
```

---

## Daily Workflow

### Morning Routine
```bash
# Start Chrome debug instance (if not already running)
chrome-mcp start

# Start your dev server
npm run dev
```

### During Development
- Chrome stays open in the background
- Claude Code MCP connects to the **same** instance every time
- No duplicate processes spawned

### When Issues Occur
```bash
# Restart everything cleanly
chrome-mcp restart

# Or manually:
chrome-mcp stop
chrome-mcp start
```

### Evening Cleanup (Optional)
```bash
# Stop Chrome debug instance
chrome-mcp stop
```

---

## Advanced: Auto-Start on Login (Optional)

### Option 1: LaunchAgent (macOS)

```bash
# Install the LaunchAgent
cp /tmp/com.chrome.mcp.debug.plist ~/Library/LaunchAgents/

# Load it
launchctl load ~/Library/LaunchAgents/com.chrome.mcp.debug.plist

# Chrome will now start automatically when you log in
```

### Option 2: Shell Startup Script

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Auto-start Chrome MCP debug instance
if command -v chrome-mcp &> /dev/null; then
    chrome-mcp status > /dev/null 2>&1 || chrome-mcp start > /dev/null 2>&1 &
fi
```

---

## Troubleshooting

### "Port 9222 already in use"

```bash
# Find what's using the port
lsof -ti :9222

# Kill it
lsof -ti :9222 | xargs kill

# Or use the manager
chrome-mcp restart
```

### "Lock file exists but process not running"

```bash
# Clean up stale lock
rm -f ~/.cache/chrome-mcp.lock

# Restart
chrome-mcp start
```

### Multiple processes still spawning

1. **Verify your config**:
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   Should contain `--browserUrl=http://localhost:9222`

2. **Restart Claude Code completely**

3. **Check no rogue processes**:
   ```bash
   ps aux | grep chrome-devtools-mcp
   ```

4. **Nuclear option**:
   ```bash
   chrome-mcp stop
   pkill -9 -f chrome-devtools-mcp
   pkill -9 -f "remote-debugging-port=9222"
   chrome-mcp start
   ```

---

## Token Optimization

### Update Snapshot Workflow

**OLD (high token cost)**:
```typescript
const snapshot = await browser.take_snapshot();
// Transmits full accessibility tree via API (3000-5000 tokens)
```

**NEW (low token cost)**:
```typescript
const snapshot = await browser.take_snapshot({
  filePath: `/tmp/snapshot-${Date.now()}.txt`,
  verbose: false
});
// Saves to file, minimal token usage (~50 tokens)
```

### Disable Unused Categories

Add to your config for additional 30-40% token reduction:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--browserUrl=http://localhost:9222",
        "--categoryPerformance=false",
        "--categoryEmulation=false"
      ]
    }
  }
}
```

Enable them only when needed:
- `--categoryPerformance=true` - For performance tracing
- `--categoryEmulation=true` - For device emulation
- `--categoryNetwork=false` - Rarely needed (network requests)

---

## Verification

### Test the Setup

```bash
# 1. Check Chrome is running
chrome-mcp status

# 2. Start Claude Code

# 3. In Claude Code, run:
# await browser.navigate({ url: "http://localhost:8080" });
# await browser.take_snapshot({ filePath: "/tmp/test.txt", verbose: false });

# 4. Verify no duplicates
ps aux | grep chrome-devtools-mcp | grep -v grep
# Should show 0-1 processes, not multiple
```

### Success Metrics

✅ **Before**: 2-3 Chrome MCP processes running
✅ **After**: 0-1 Chrome MCP processes running

✅ **Before**: ~3000-5000 tokens per snapshot
✅ **After**: ~50-500 tokens per snapshot

✅ **Before**: "Browser already running" errors
✅ **After**: No errors, stable connection

---

## Manager Commands Reference

```bash
chrome-mcp start      # Start Chrome debug instance
chrome-mcp stop       # Kill all Chrome MCP processes
chrome-mcp restart    # Stop and start cleanly
chrome-mcp status     # Check if running
```

---

## How It Works

```
┌─────────────────────────────────────────────────┐
│  Claude Code Session 1                          │
│  ├─ MCP Client                                  │
│  │  └─ Connects to http://localhost:9222  ────┐│
└─────────────────────────────────────────────────┘│
                                                   │
┌─────────────────────────────────────────────────┐│
│  Claude Code Session 2                          ││
│  ├─ MCP Client                                  ││
│  │  └─ Connects to http://localhost:9222  ────┐││
└─────────────────────────────────────────────────┘││
                                                   ││
        Both connect to same Chrome instance      ││
                        ↓↓                        ││
┌─────────────────────────────────────────────────┐││
│  Single Chrome Instance (PID: 12345)            │││
│  ├─ Remote Debugging Port: 9222                │││
│  ├─ User Data: ~/.cache/chrome-mcp-debug       │││
│  └─ Lock File: ~/.cache/chrome-mcp.lock        │││
└─────────────────────────────────────────────────┘┘
```

**Key Points**:
- Chrome runs **independently** of Claude Code
- MCP connects via WebSocket to port 9222
- Lock file prevents duplicate Chrome launches
- All sessions share the same browser state

---

## Related Documentation

- Main guide: `.claude/mcp-chrome-devtools.md`
- Token optimization: See section above
- Project instructions: `CLAUDE.md`

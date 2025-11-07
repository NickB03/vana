# Chrome MCP Quick Reference Card

## 🚀 Daily Workflow

```bash
# 1. Start Chrome (first time each day)
chrome-mcp start

# 2. Start your dev server
npm run dev

# 3. Use Claude Code normally
# MCP connects automatically to port 9222
```

## 📝 Essential Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `chrome-mcp start` | Start Chrome debug instance | Beginning of work session |
| `chrome-mcp status` | Check if running | Troubleshooting |
| `chrome-mcp stop` | Kill all Chrome processes | End of day / cleanup |
| `chrome-mcp restart` | Clean restart | When errors occur |

## ✅ Verification Checklist

After starting Chrome, verify:

```bash
# Should show: "Chrome debug instance is RUNNING"
chrome-mcp status

# Should show 0-1 processes (not 2-3)
ps aux | grep chrome-devtools-mcp | grep -v grep | wc -l

# Should show Chrome on port 9222
lsof -ti :9222
```

## 🔧 Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| **MCP Config** | Tells MCP to connect, not launch | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Manager Script** | Controls Chrome instance | `~/.local/bin/chrome-mcp` |
| **Setup Guide** | Full documentation | `.claude/chrome-mcp-setup.md` |
| **Comparison** | Before/after metrics | `.claude/chrome-mcp-comparison.md` |

## 🎯 Current MCP Config

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

**Key**: `--browserUrl` tells MCP to **connect** instead of **launch**

## 🐛 Troubleshooting

### "Browser already running" error
```bash
chrome-mcp restart
```

### Multiple processes still spawning
```bash
# 1. Verify config
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# 2. Should contain: --browserUrl=http://localhost:9222
# 3. Restart Claude Code completely
# 4. Try again
```

### Port 9222 in use
```bash
# Find and kill what's using it
lsof -ti :9222 | xargs kill

# Then start fresh
chrome-mcp start
```

### Stale lock file
```bash
rm -f ~/.cache/chrome-mcp.lock
chrome-mcp start
```

## 📊 Token Optimization Tips

### Use file-based snapshots
```typescript
// ❌ OLD WAY (high tokens)
await browser.take_snapshot();

// ✅ NEW WAY (low tokens)
await browser.take_snapshot({
  filePath: "/tmp/snapshot.txt",
  verbose: false
});
```

### Disable unused categories

Add to MCP config for 30-40% additional savings:
```json
"args": [
  "chrome-devtools-mcp@latest",
  "--browserUrl=http://localhost:9222",
  "--categoryPerformance=false",
  "--categoryEmulation=false"
]
```

## 🎓 How It Works

```
Your Workflow:
  chrome-mcp start → Launches 1 Chrome on port 9222
                ↓
  Claude Code (Session 1) → Connects to port 9222
  Claude Code (Session 2) → Connects to port 9222
  Claude Code (Session 3) → Connects to port 9222
                ↓
  All sessions share SAME Chrome instance
  No duplicates!
```

## 📈 Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Chrome processes | 2-3 | 1 |
| Tokens/snapshot | 3000-5000 | 50-500 |
| Startup time | 5-8s | 1-2s |
| "Browser running" errors | Frequent | None |

## 🔗 Related Docs

- **Full Setup Guide**: `.claude/chrome-mcp-setup.md`
- **Before/After Comparison**: `.claude/chrome-mcp-comparison.md`
- **Original MCP Guide**: `.claude/mcp-chrome-devtools.md`
- **Project Instructions**: `CLAUDE.md`

---

**Last Updated**: 2025-11-06
**Status**: ✅ Configured and ready to use

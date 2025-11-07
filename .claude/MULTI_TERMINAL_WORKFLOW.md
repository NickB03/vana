# Multi-Terminal Workflow Guide

**Hardware**: MacBook Pro M4 Max, 36GB RAM
**Use Case**: Multiple terminals, same project, managed work distribution

## Current Setup Status

✅ **Chrome MCP**: Fixed - all terminals share single Chrome instance (port 9222)
✅ **Resource Usage**: ~7% RAM usage with 5 Claude instances
✅ **Configuration**: Optimized in `~/.claude.json`

## Daily Routine

### Morning Startup
```bash
# 1. Start shared Chrome instance
chrome-mcp start

# 2. Verify it's running
chrome-mcp status

# 3. Start dev server
npm run dev
```

### During Work
- Open as many terminal sessions as needed
- Each connects to the same Chrome instance
- All share project context and git state

### Evening Cleanup (Optional)
```bash
# Stop Chrome instance
chrome-mcp stop

# Or leave it running for next day
```

## Terminal Organization Strategy

### Recommended Split

**Terminal 1: Primary Development**
- Main feature work
- Complex implementations
- Full permissions mode

**Terminal 2: Testing & Debugging**
- Browser automation testing
- Quick fixes and iterations
- Can run `--dangerously-skip-permissions` for speed

**Terminal 3: Refactoring & Cleanup**
- Code improvements
- Documentation updates
- Low-risk changes

**VS Code Extension: Current Focus**
- Active file you're editing
- Quick questions and guidance
- IDE-integrated workflow

## Resource Monitoring

### Quick Checks
```bash
# Chrome status
chrome-mcp status

# Active Claude instances
ps aux | grep "\.local/bin/claude" | grep -v grep | wc -l

# Memory usage
ps aux | grep "\.local/bin/claude" | grep -v grep | awk '{sum+=$4} END {printf "%.1f%% RAM\n", sum}'
```

### Expected Metrics
- **Claude instances**: 1-5 typical, up to 10 possible
- **RAM usage**: 0.4-0.5GB per instance
- **Chrome**: 1 shared instance (~400MB)
- **Total**: 2-5GB typical (well under 36GB capacity)

## Conflict Avoidance Best Practices

Since all terminals work on the same project:

### ✅ DO:
- Assign different features/files to different terminals
- Use one terminal per logical task
- Leverage shared git state (all see same commits)
- Use shared Chrome for consistent browser testing

### ⚠️ AVOID:
- Multiple terminals editing the same file simultaneously
- Running database migrations in parallel
- Concurrent npm installs
- Multiple dev servers on same port

## Troubleshooting

### "Too many Claude instances"
```bash
# Check count
ps aux | grep "\.local/bin/claude" | grep -v grep | wc -l

# If > 6, consider closing some
pkill -f "\.local/bin/claude"  # Nuclear option
```

### "Chrome MCP not connecting"
```bash
# Restart Chrome
chrome-mcp restart

# Verify config
cat ~/.claude.json | jq '.projects["/Users/nick/Projects/llm-chat-site"].mcpServers["chrome-devtools"]'

# Should show: "--browserUrl=http://localhost:9222"
```

### "Memory getting high"
```bash
# Check total usage
claude-mem

# If > 10GB, restart some terminals
# (You have 36GB, so this is unlikely!)
```

## Performance Tips

### M4 Max Optimizations

With your hardware, you can:
- ✅ Enable all MCP categories (performance, network, emulation)
- ✅ Use verbose snapshot mode when needed
- ✅ Run background processes without concern
- ✅ Keep Chrome visible (headless=false)

### Optional: Enable Full Features
Edit `~/.claude.json` to enable all Chrome features:
```json
{
  "args": [
    "chrome-devtools-mcp@latest",
    "--browserUrl=http://localhost:9222",
    "--categoryPerformance=true",
    "--categoryEmulation=true",
    "--categoryNetwork=true"
  ]
}
```

You have the RAM to spare!

## Advanced: Session Naming

Add to `~/.zshrc`:
```bash
# Function to start named Claude session
claude-session() {
  local name=$1
  echo "Starting Claude session: $name"
  PS1="[$name] %~ %# " claude --dangerously-skip-permissions
}

# Usage:
# claude-session "frontend"
# claude-session "backend"
# claude-session "testing"
```

## Related Documentation

- **Chrome MCP Setup**: `.claude/chrome-mcp-setup.md`
- **Chrome MCP Comparison**: `.claude/chrome-mcp-comparison.md`
- **Quick Reference**: `.claude/QUICK_REFERENCE_CHROME_MCP.md`
- **Main Project Guide**: `CLAUDE.md`

---

**Last Updated**: 2025-11-06
**Hardware**: M4 Max, 36GB RAM
**Status**: Optimized for multi-terminal workflow

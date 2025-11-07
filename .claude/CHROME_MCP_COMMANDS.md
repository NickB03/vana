# Chrome DevTools MCP Slash Commands

Custom slash commands for managing Chrome DevTools MCP in this project.

## Available Commands

### `/kill-chromedev`
**Description**: Nuclear option - kills ALL Chrome DevTools MCP processes and restarts clean

**What it does**:
1. Kills all `chrome-devtools-mcp` processes
2. Kills Chrome debug instance on port 9222
3. Removes stale lock files
4. Restarts Chrome with `chrome-mcp start`
5. Verifies the new state

**When to use**:
- Chrome is completely stuck
- Multiple rogue processes running
- Port 9222 conflicts
- After major config changes
- "Nothing else works" scenario

**Usage**:
```
/kill-chromedev
```

**Example output**:
```
✓ Killed 3 chrome-devtools-mcp processes
✓ Killed Chrome debug instance (PID: 12345)
✓ Removed stale lock file
✓ Chrome debug instance ready (PID: 67890)
✓ Debug port 9222 is ACCESSIBLE

Status: READY
Active MCP processes: 0
```

---

### `/chrome-status`
**Description**: Comprehensive status check for Chrome DevTools MCP

**What it shows**:
- Chrome MCP manager status
- Active MCP process count
- Chrome debug instance details (PID, RAM, uptime)
- Port 9222 status
- Total resource usage

**When to use**:
- Verify Chrome is running correctly
- Check resource usage
- Troubleshoot connection issues
- Monitor system health

**Usage**:
```
/chrome-status
```

**Example output**:
```
✓ Chrome debug instance is RUNNING (PID: 37508)
✓ Debug port 9222 is ACCESSIBLE

=== MCP Processes ===
Active MCP processes: 0

=== Chrome Debug Instance ===
PID: 37508 - RAM: 0.6% - Started: 6:16PM

=== Port 9222 Status ===
✅ Port 9222 is ACTIVE

=== Resource Usage ===
Total Chrome MCP RAM: 0.6%
```

---

### `/chrome-restart`
**Description**: Clean restart of Chrome DevTools MCP (gentle approach)

**What it does**:
1. Uses `chrome-mcp restart` (built-in safe restart)
2. Verifies new instance is running
3. Reports status

**When to use**:
- Minor issues or sluggishness
- After config updates
- Routine maintenance
- Want to preserve other processes

**Difference from `/kill-chromedev`**:
- **`/chrome-restart`**: Gentle, uses built-in manager
- **`/kill-chromedev`**: Nuclear, force-kills everything

**Usage**:
```
/chrome-restart
```

**Example output**:
```
✓ Killing all chrome-devtools-mcp processes...
✓ All processes killed
✓ Starting Chrome debug instance on port 9222...
✓ Chrome debug instance ready (PID: 45678)
✓ Debug URL: http://localhost:9222

Status: Chrome restarted successfully
```

---

## Decision Tree

```
Having Chrome MCP issues?
│
├─ Minor issue / routine restart?
│  └─ Use /chrome-restart ✅
│
├─ Need to check if it's running?
│  └─ Use /chrome-status ✅
│
└─ Everything broken / multiple processes?
   └─ Use /kill-chromedev ✅ (nuclear option)
```

## Command Comparison

| Command | Aggressiveness | Use Case |
|---------|----------------|----------|
| `/chrome-status` | 👀 Read-only | Check status, diagnose issues |
| `/chrome-restart` | 🔄 Gentle | Routine restart, minor issues |
| `/kill-chromedev` | 💥 Nuclear | Serious issues, multiple processes |

## Manual Alternatives

If slash commands don't work, use these direct commands:

**Status**:
```bash
chrome-mcp status
```

**Restart**:
```bash
chrome-mcp restart
```

**Nuclear kill**:
```bash
pkill -f "chrome-devtools-mcp"
lsof -ti :9222 | xargs kill -9 2>/dev/null
rm -f ~/.cache/chrome-mcp.lock
chrome-mcp start
```

---

## Notes

- These commands use the `chrome-mcp` manager script (installed at `~/.local/bin/chrome-mcp`)
- All commands run with `model: haiku` for speed
- Commands are project-specific (located in `.claude/commands/`)
- Slash commands auto-reload when files change (no restart needed)

---

## Related Documentation

- **Setup Guide**: `.claude/chrome-mcp-setup.md`
- **Quick Reference**: `.claude/QUICK_REFERENCE_CHROME_MCP.md`
- **Multi-Terminal Workflow**: `.claude/MULTI_TERMINAL_WORKFLOW.md`

---

**Last Updated**: 2025-11-06
**Location**: `.claude/commands/`

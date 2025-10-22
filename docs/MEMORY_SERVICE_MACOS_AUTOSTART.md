# MCP Memory Service - macOS Auto-Start Setup

## ✅ Complete - LaunchAgent Installed

The memory service is now configured to **auto-start on Mac login**.

---

## How It Works

**LaunchAgent File**: `~/Library/LaunchAgents/com.vana.mcp-memory-service.plist`

```
Mac Login
    ↓
LaunchAgent loads (automatically)
    ↓
Starts: python -m mcp_memory_service.server
    ↓
Service runs in background on port 8888
    ↓
Claude Code hooks find it and use it
```

---

## Management Commands

### ✅ Check Status
```bash
launchctl list | grep mcp-memory
# Output: -	0	com.vana.mcp-memory-service
# 0 = healthy, running, no errors
```

### Start the Service
```bash
launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

### Stop the Service
```bash
launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

### Restart the Service
```bash
launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
sleep 1
launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

### View Logs
```bash
# Service output
tail -f ~/.mcp_memory/launchd.log

# Error output
tail -f ~/.mcp_memory/launchd.error.log
```

### Test It's Running
```bash
# Check HTTP port
lsof -i :8888

# Quick health check
curl http://127.0.0.1:8888/api/health

# View stored memories
curl http://127.0.0.1:8888/api/memories
```

---

## Current Status

✅ **LaunchAgent Loaded**: com.vana.mcp-memory-service
✅ **Auto-Start Enabled**: Yes (will start on next Mac login)
✅ **Keep-Alive**: Enabled (auto-restarts if crashes)
✅ **Logs**: ~/.mcp_memory/launchd.log

---

## What Gets Auto-Started

```
Service:   MCP Memory Service v8.5.6
Port:      8888
Backend:   SQLite-vec
Database:  ~/.mcp_memory/database.db
Process:   python -m mcp_memory_service.server
```

---

## Disable Auto-Start (Optional)

If you want to stop it from auto-starting on login:

```bash
launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

Then manually start only when needed:
```bash
cd ~/Projects/vana/mcp-memory-service
uv run memory server
```

---

## Re-Enable Auto-Start

```bash
launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

---

## Troubleshooting

### Service Not Starting

```bash
# Check if loaded
launchctl list | grep mcp-memory

# If missing, reload
launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist

# Check logs
tail ~/.mcp_memory/launchd.error.log
```

### Service Keeps Crashing

```bash
# View error log
tail -f ~/.mcp_memory/launchd.error.log

# Check if port 8888 is in use
lsof -i :8888

# Kill conflicting process
kill -9 <PID>

# Restart service
launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
sleep 1
launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

### Service Takes a While to Start

This is **normal** on first startup:
- ONNX embeddings model is loaded (~384MB)
- Can take 5-10 seconds first time
- Subsequent startups are faster (cached)

---

## How It Integrates with Claude Code

```
Mac Login
    ↓
LaunchAgent auto-starts memory service
    ↓
Memory service running in background (port 8888)
    ↓
You open Claude Code
    ↓
Claude hooks try to connect
    ↓
✅ Find it running (fast HTTP connection)
    ↓
Hooks inject memories automatically
    ↓
You work normally
```

**No manual steps needed** - everything is automatic! 🎉

---

## Uninstall (If You Change Your Mind)

```bash
# Stop the service
launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist

# Delete the plist file
rm ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist
```

---

## Summary

| Action | Command |
|--------|---------|
| Check status | `launchctl list \| grep mcp-memory` |
| Start now | `launchctl load ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist` |
| Stop | `launchctl unload ~/Library/LaunchAgents/com.vana.mcp-memory-service.plist` |
| Restart | See "Restart the Service" above |
| View logs | `tail -f ~/.mcp_memory/launchd.log` |
| Test | `curl http://127.0.0.1:8888/api/health` |

---

**Status**: ✅ Auto-start configured and active
**Next**: Next time you restart your Mac, the service will start automatically!

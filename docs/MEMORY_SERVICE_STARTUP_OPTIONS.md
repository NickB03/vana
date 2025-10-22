# MCP Memory Service - Startup Options Clarification

## Current Status: ✅ PARTIALLY IN PLACE

Option 2 (Full Auto) **IS configured** but works as **fallback only**. Here's how it actually works:

---

## How It Currently Works

### Current Configuration
```json
{
  "protocol": "auto",
  "preferredProtocol": "http",
  "fallbackEnabled": true,
  "http": {
    "endpoint": "http://127.0.0.1:8888"
  },
  "mcp": {
    "serverCommand": ["uv", "run", "memory", "server", "-s", "sqlite_vec"]
  }
}
```

### Connection Flow (Automatic)

```
Hook fires (SessionStart, SessionEnd, or UserPromptSubmit)
    ↓
Try Protocol 1: HTTP
    ├─ Attempt to connect to http://127.0.0.1:8888
    ├─ ✅ If server running → USE IT (FAST)
    └─ ❌ If server NOT running → FAIL, go to Protocol 2
    ↓
Try Protocol 2: MCP (Fallback)
    ├─ Spawn new server: uv run memory server -s sqlite_vec
    ├─ Wait for connection (2 second timeout)
    ├─ ✅ If successful → USE IT (SLOWER, first run)
    └─ ❌ If fails → Hook fails gracefully
```

---

## Two Real-World Scenarios

### Scenario A: You Start Server Manually (CURRENT BEST)

```bash
# Terminal 1: Start service once
cd ~/Projects/vana/mcp-memory-service
uv run memory server

# Terminal 2: Use Claude Code (hooks use fast HTTP connection)
# Then hooks will:
# 1. Try HTTP → FOUND ✅ (fast)
# 2. Use it
```

**Pros:**
- ✅ Faster (HTTP is quicker than spawning new process)
- ✅ Server stays running across sessions
- ✅ Better resource management
- ✅ Visible in terminal (can see what's happening)

**Cons:**
- ⚠️ Requires one manual step

---

### Scenario B: No Manual Startup (FULL AUTO, But Slower)

```bash
# Terminal: Just open Claude Code, don't start anything
# Hooks will:
# 1. Try HTTP → NOT FOUND ❌
# 2. Spawn MCP server automatically ✅
# 3. Connect to it
```

**Pros:**
- ✅ Completely automatic (no manual steps)
- ✅ Works without thinking

**Cons:**
- ⚠️ Slower (spawns new process first time)
- ⚠️ Server restarts each hook invocation
- ⚠️ Resource overhead (multiple spawns)
- ⚠️ Can't see server in terminal (silent background)

---

## Recommendation

### ✅ **Use Scenario A** (Manual Start - Recommended)

This is the best balance:

```bash
# Once at session start (in a separate terminal)
cd ~/Projects/vana/mcp-memory-service
uv run memory server
```

Then just use Claude Code normally. This gives you:
- ✅ Fast performance (HTTP connection)
- ✅ Visible server logs
- ✅ Persistent across sessions
- ✅ Can easily restart if needed

---

## How to Enable FULL Auto (Optional)

If you want Scenario B (completely automatic spawning), change the config:

**Option 1: Switch Preferred Protocol to MCP**
```json
// ~/.claude/hooks/config.json
"preferredProtocol": "mcp"  // Instead of "http"
```

**Option 2: Add Auto-Start Script**
Create `~/.claude/hooks/auto-start-memory.sh`:
```bash
#!/bin/bash
# Auto-start memory service if not running
if ! curl -s http://127.0.0.1:8888/api/health > /dev/null 2>&1; then
  cd ~/Projects/vana/mcp-memory-service
  nohup uv run memory server > ~/.mcp_memory/server.log 2>&1 &
  sleep 1
fi
```

Then call before Claude Code startup.

---

## Summary

| Aspect | Current Setup | Full Auto |
|--------|---------------|-----------|
| **Startup** | Manual `uv run memory server` | Automatic spawn on first hook |
| **Performance** | Fast (HTTP) | Slower (spawn overhead) |
| **Visibility** | See server logs | Silent background |
| **Resource Use** | Single process | May spawn multiple times |
| **Recommended** | ✅ YES | ⚠️ Only if you prefer zero setup |

---

## What You Should Do Now

### ✅ Current Best Practice

```bash
# Terminal 1: Start memory service ONCE
cd ~/Projects/vana/mcp-memory-service
uv run memory server

# Output will show:
# 🚀 MCP Memory Service starting...
# 📊 Storage: SQLite-vec at ~/.mcp_memory/database.db
# 🌐 HTTP API: http://127.0.0.1:8888
# ✅ Ready for connections
```

```bash
# Terminal 2: Just use Claude Code normally
# Hooks will automatically find the running service
# No additional setup needed!
```

---

## Testing It Works

### Test 1: Check Service is Running
```bash
curl http://127.0.0.1:8888/api/health
# Expected: {"status": "ok", "memories": X}
```

### Test 2: Open Claude Code Session
- SessionStart hook should fire
- Should see memories injected
- (Check in Claude Code output/logs)

### Test 3: Work and Close Session
- SessionEnd hook should fire
- Should see new memory created
- (Verify with: `curl http://127.0.0.1:8888/api/memories`)

---

**No action required right now** - the system will work either way. But I recommend keeping a terminal running with `uv run memory server` for best performance.

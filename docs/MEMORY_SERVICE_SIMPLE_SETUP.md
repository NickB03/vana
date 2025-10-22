# MCP Memory Service - Simple Setup (No Auto-Start)

## ✅ Cleaned Up & Reverted

All LaunchAgent and shell script changes have been **removed**. Your existing venv auto-launch setup is untouched.

---

## Simple Usage

Just run this when you want to use the memory service:

```bash
cd ~/Projects/vana/mcp-memory-service
uv run memory server
```

That's it! The server starts on **http://127.0.0.1:8888** and Claude Code hooks will automatically find it and use it.

---

## How It Works

```
1. Open Terminal
2. cd ~/Projects/vana/mcp-memory-service
3. uv run memory server
4. (Service starts in background)
5. Open Claude Code
6. Hooks automatically connect and inject memories
```

---

## Check If It's Running

```bash
# Quick test
curl http://127.0.0.1:8888/api/health

# View stored memories
curl http://127.0.0.1:8888/api/memories

# Check port is listening
lsof -i :8888
```

---

## Stop the Service

```bash
# Press Ctrl+C in the terminal where it's running
```

Or from another terminal:

```bash
pkill -f "memory server"
```

---

## That's All You Need!

- ✅ No LaunchAgent interference
- ✅ No shell script modifications
- ✅ Your existing venv setup untouched
- ✅ Simple manual startup when needed
- ✅ Claude hooks work automatically once it's running

**No further setup required.** 🎉

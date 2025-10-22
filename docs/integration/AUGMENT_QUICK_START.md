# 🚀 Augment Code + MCP Memory Service - Quick Start

## ⚡ 3-Minute Setup

### Step 1: Open Augment Settings (30 seconds)
```
1. Click Augment icon in VS Code sidebar
2. Click gear icon (⚙️) in top-right corner
3. Click "Settings"
```

### Step 2: Add MCP Server (1 minute)
```
1. Scroll to "MCP Servers" section
2. Click "+ Add MCP Server"
3. Fill in:
   - Name: memory-service
   - Command: uv
   - Args: (see below)
```

### Step 3: Configure Arguments (1 minute)
```
Click "Add Argument" and enter each line:

1. --directory
2. ~/Projects/vana/mcp-memory-service
3. run
4. memory
5. server
6. -s
7. sqlite_vec
```

### Step 4: Save & Verify (30 seconds)
```
1. Click "Save"
2. Wait for connection
3. Verify status shows "✓ Connected"
```

---

## 📋 Alternative: Import from JSON (1 minute)

1. Click "Import from JSON" in MCP section
2. Copy this JSON:

```json
{
  "mcpServers": {
    "memory-service": {
      "command": "uv",
      "args": [
        "--directory",
        "~/Projects/vana/mcp-memory-service",
        "run",
        "memory",
        "server",
        "-s",
        "sqlite_vec"
      ]
    }
  }
}
```

3. Paste and click "Save"

---

## ✅ Verify It Works

### Test 1: Store Memory
```
In Augment Code, ask:
"Store this in memory: Test message from Augment Code"
```

### Test 2: Retrieve from Claude
```
Switch to Claude Code and ask:
"Recall memories about Augment Code"
```

**Expected**: Claude Code retrieves the memory you stored in Augment Code ✅

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Command not found: uv" | Use full path: `~/.local/bin/uv` or add to PATH |
| "Connection failed" | Check path is correct: `~/Projects/vana/mcp-memory-service/` |
| "Database locked" | Normal - SQLite-vec handles concurrent access |
| "No memories found" | Verify both tools are using same database |

---

## 📊 What You Get

✅ Single shared memory database (no duplication)
✅ Both Augment Code and Claude Code access same memories
✅ Semantic search with ONNX embeddings
✅ Tag-based memory organization
✅ Concurrent access support
✅ Production-ready system

---

## 📚 Full Documentation

- **Complete Setup Guide**: `AUGMENT_CODE_MCP_SETUP.md`
- **Integration Status**: `AUGMENT_INTEGRATION_COMPLETE.md`
- **JSON Configuration**: `AUGMENT_MCP_JSON_CONFIG.json`
- **Integration Tests**: `mcp-memory-service/test_augment_integration.py`

---

## 🎯 Key Paths

```
Installation:     ~/Projects/vana/mcp-memory-service/
Database:         ~/Library/Application Support/mcp-memory/sqlite_vec.db (macOS)
                  ~/.local/share/mcp-memory/sqlite_vec.db (Linux)
                  %APPDATA%\mcp-memory\sqlite_vec.db (Windows)
Embeddings Cache: ~/.cache/mcp_memory/onnx_models/all-MiniLM-L6-v2/
```

---

## ✨ You're All Set!

Once configured, Augment Code will have access to the same memory system as Claude Code. Start using it immediately! 🎉

**Questions?** See `AUGMENT_CODE_MCP_SETUP.md` for detailed troubleshooting.


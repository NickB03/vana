# Augment Code + MCP Memory Service Integration Guide

## Overview

This guide configures Augment Code to use the existing MCP Memory Service installation, enabling shared memory between Augment Code and Claude Code.

**Key Benefits:**
- ✅ Single shared memory database (no duplication)
- ✅ Both AI assistants access the same memories
- ✅ Seamless context sharing between tools
- ✅ No additional installation required

---

## Prerequisites

✅ **Already Completed:**
- MCP Memory Service v8.5.6 installed at `~/Projects/vana/mcp-memory-service/`
- SQLite-vec database at `~/Library/Application Support/mcp-memory/sqlite_vec.db`
- ONNX embeddings model cached and working
- Claude Code already configured and connected

---

## Configuration Steps for Augment Code

### Step 1: Open Augment Code Settings

1. Open **VS Code** with the Augment Code extension
2. Click the **Augment icon** in the left sidebar
3. Click the **gear icon** (⚙️) in the top-right corner of the Augment panel
4. Select **Settings**

### Step 2: Navigate to MCP Configuration

1. In the Settings panel, scroll down to find the **MCP Servers** section
2. Click the **+ Add MCP Server** button (or **Import from JSON** if available)

### Step 3: Configure the Memory Service

**Option A: Manual Configuration (Recommended)**

Fill in the following fields:

| Field | Value |
|-------|-------|
| **Name** | `memory-service` |
| **Command** | `uv` |
| **Args** (line 1) | `--directory` |
| **Args** (line 2) | `~/Projects/vana/mcp-memory-service` |
| **Args** (line 3) | `run` |
| **Args** (line 4) | `memory` |
| **Args** (line 5) | `server` |
| **Args** (line 6) | `-s` |
| **Args** (line 7) | `sqlite_vec` |

**Option B: Import from JSON**

Click **Import from JSON** and paste:

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

### Step 4: Save Configuration

1. Click **Save** or **Apply**
2. Augment Code will validate the configuration
3. You should see a **✓ Connected** status next to `memory-service`

### Step 5: Verify Connection

1. In the Augment panel, look for the MCP Servers section
2. Confirm `memory-service` shows as **Connected** (✓)
3. If not connected, check:
   - Is the path correct?
   - Is `uv` installed and in PATH?
   - Are there any error messages?

---

## Testing Shared Memory

### Test 1: Store Memory from Augment Code

In Augment Code, ask:
```
Store this in memory: "Augment Code successfully connected to MCP Memory Service on 2025-10-20"
```

### Test 2: Retrieve from Claude Code

Switch to Claude Code and ask:
```
Recall memories about Augment Code connecting to the memory service
```

**Expected Result:** Claude Code should retrieve the memory stored by Augment Code.

### Test 3: Cross-Tool Memory Access

1. **Augment Code**: Store a memory with tags `["augment", "test"]`
2. **Claude Code**: Search for memories with tag `"augment"`
3. **Verify**: Both tools access the same database

### Test 4: Concurrent Access

1. Open both Augment Code and Claude Code
2. Store a memory in Augment Code
3. Immediately retrieve it in Claude Code
4. Verify no conflicts or errors

---

## Troubleshooting

### Issue: "MCP Server Failed to Connect"

**Solution:**
1. Verify the path: `~/Projects/vana/mcp-memory-service/`
2. Check `uv` is installed: `which uv`
3. Test manually: `cd ~/Projects/vana/mcp-memory-service && uv run memory server -s sqlite_vec`
4. Check for error messages in Augment Code console

### Issue: "Command Not Found: uv"

**Solution:**
1. Ensure `uv` is in your PATH
2. Use full path: `~/.local/bin/uv` instead of `uv`
3. Or add to PATH in Augment settings

### Issue: "Database Locked"

**Solution:**
1. This is normal with concurrent access
2. SQLite-vec uses WAL (Write-Ahead Logging) for concurrent access
3. If persistent, restart both applications

### Issue: "Embeddings Not Working"

**Solution:**
1. Verify ONNX model is cached: `ls ~/.cache/mcp_memory/onnx_models/`
2. Run verification: `cd ~/Projects/vana/mcp-memory-service && uv run python verify_installation.py`
3. Check for tokenizer warnings (non-critical)

---

## Verification Checklist

- [ ] Augment Code MCP Settings panel shows `memory-service`
- [ ] Status shows **✓ Connected**
- [ ] Can store memories from Augment Code
- [ ] Can retrieve memories in Claude Code
- [ ] Database file exists: `~/Library/Application Support/mcp-memory/sqlite_vec.db`
- [ ] ONNX model cached: `~/.cache/mcp_memory/onnx_models/all-MiniLM-L6-v2/`
- [ ] Both tools access same database (no duplication)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Shared Memory System                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐      │
│  │  Augment Code    │         │   Claude Code    │      │
│  │  (VS Code Ext)   │         │  (Desktop App)   │      │
│  └────────┬─────────┘         └────────┬─────────┘      │
│           │                            │                 │
│           └────────────┬───────────────┘                 │
│                        │                                 │
│           ┌────────────▼────────────┐                   │
│           │  MCP Memory Service     │                   │
│           │  (stdio transport)      │                   │
│           │  v8.5.6                 │                   │
│           └────────────┬────────────┘                   │
│                        │                                 │
│           ┌────────────▼────────────┐                   │
│           │  SQLite-vec Backend     │                   │
│           │  (Shared Database)      │                   │
│           └────────────┬────────────┘                   │
│                        │                                 │
│           ┌────────────▼────────────┐                   │
│           │  ONNX Embeddings        │                   │
│           │  (Local, CPU-based)     │                   │
│           └────────────┬────────────┘                   │
│                        │                                 │
│           ┌────────────▼────────────┐                   │
│           │  Persistent Storage     │                   │
│           │  ~/Library/Application  │                   │
│           │  Support/mcp-memory/    │                   │
│           └────────────────────────┘                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Configure Augment Code** using the steps above
2. **Test memory operations** using the test cases provided
3. **Monitor performance** - check for any latency issues
4. **Optimize if needed** - adjust performance profiles in Claude Hooks config

---

## Support & Documentation

- **MCP Memory Service**: `~/Projects/vana/mcp-memory-service/README.md`
- **Augment Code Docs**: https://docs.augmentcode.com/setup-augment/mcp
- **Claude Code Docs**: https://docs.claude.com/en/docs/claude-code/mcp
- **MCP Protocol**: https://modelcontextprotocol.io/

---

## Summary

✅ **Installation Status**: Production-Ready
- Single shared memory database
- Both AI assistants configured
- ONNX embeddings working
- SQLite-vec backend operational
- No duplication of resources

**Result**: Seamless memory sharing between Augment Code and Claude Code! 🎉


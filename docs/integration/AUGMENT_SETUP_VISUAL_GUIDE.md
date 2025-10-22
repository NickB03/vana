# 📸 Augment Code MCP Setup - Visual Step-by-Step Guide

## Overview

**Platform**: This guide is written for macOS. Linux and Windows users should adapt paths accordingly:
- **macOS**: `~/Library/Application Support/`, `~/.local/bin/`
- **Linux**: `~/.local/share/`, `~/.local/bin/`
- **Windows**: `%APPDATA%\`, `C:\Users\<username>\AppData\`

This guide shows exactly where to click and what to enter to configure Augment Code with the MCP Memory Service.

---

## Step 1: Open Augment Settings

### Location
```
VS Code Left Sidebar
    ↓
[Augment Icon] ← Click here
    ↓
Top-right corner of Augment panel
    ↓
[⚙️ Gear Icon] ← Click here
    ↓
Select "Settings"
```

### What You'll See
```
┌─────────────────────────────────────┐
│ Augment Panel                       │
├─────────────────────────────────────┤
│                              [⚙️]   │ ← Click gear icon
│                                     │
│ [Chat] [Agent] [Tasklist]          │
│                                     │
│ ... (chat content)                 │
│                                     │
└─────────────────────────────────────┘
```

---

## Step 2: Navigate to MCP Servers

### In Settings Panel
```
Settings Panel
    ↓
Scroll down to find:
    ↓
┌─────────────────────────────────────┐
│ MCP Servers                         │
│ ─────────────────────────────────── │
│                                     │
│ [+ Add MCP Server]                 │ ← Click here
│                                     │
│ [Import from JSON]                 │ ← Or click here
│                                     │
└─────────────────────────────────────┘
```

---

## Step 3: Choose Configuration Method

### Option A: Manual Entry (Recommended for first-time)

Click **[+ Add MCP Server]**

```
┌─────────────────────────────────────┐
│ Add MCP Server                      │
├─────────────────────────────────────┤
│                                     │
│ Name: [memory-service]              │ ← Enter this
│                                     │
│ Command: [uv]                       │ ← Enter this
│                                     │
│ Arguments:                          │
│ ┌─────────────────────────────────┐ │
│ │ [+ Add Argument]                │ │ ← Click to add each
│ │                                 │ │
│ │ 1. --directory                  │ │
│ │ 2. /Users/nick/Projects/vana... │ │
│ │ 3. run                          │ │
│ │ 4. memory                       │ │
│ │ 5. server                       │ │
│ │ 6. -s                           │ │
│ │ 7. sqlite_vec                   │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Save]  [Cancel]                    │ ← Click Save
│                                     │
└─────────────────────────────────────┘
```

### Option B: Import from JSON (Faster)

Click **[Import from JSON]**

```
┌─────────────────────────────────────┐
│ Import MCP Configuration            │
├─────────────────────────────────────┤
│                                     │
│ Paste JSON below:                   │
│ ┌─────────────────────────────────┐ │
│ │ {                               │ │
│ │   "mcpServers": {               │ │
│ │     "memory-service": {         │ │
│ │       "command": "uv",          │ │
│ │       "args": [                 │ │
│ │         "--directory",          │ │
│ │         "/Users/nick/Projects..│ │
│ │         "run",                  │ │
│ │         "memory",               │ │
│ │         "server",               │ │
│ │         "-s",                   │ │
│ │         "sqlite_vec"            │ │
│ │       ]                         │ │
│ │     }                           │ │
│ │   }                             │ │
│ │ }                               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Save]  [Cancel]                    │ ← Click Save
│                                     │
└─────────────────────────────────────┘
```

---

## Step 4: Verify Connection

### After Saving

```
┌─────────────────────────────────────┐
│ MCP Servers                         │
├─────────────────────────────────────┤
│                                     │
│ ✓ memory-service                    │ ← Should show ✓
│   Connected                         │   and "Connected"
│                                     │
│ [+ Add MCP Server]                  │
│ [Import from JSON]                  │
│                                     │
└─────────────────────────────────────┘
```

### If Not Connected

```
❌ memory-service
   Failed to connect

Troubleshooting:
1. Check path: ~/Projects/vana/mcp-memory-service/
2. Verify uv is installed: which uv
3. Check error message in Augment console
```

---

## Step 5: Test It Works

### In Augment Code Chat

```
You: "Store this in memory: Test message from Augment Code"

Augment: "I've stored that in memory for you."
```

### In Claude Code Chat

```
You: "Recall memories about Augment Code"

Claude: "I found a memory: 'Test message from Augment Code'"
```

### Result

```
✅ Memory stored by Augment Code
✅ Retrieved by Claude Code
✅ Integration working!
```

---

## Complete Argument List

If entering manually, add these arguments in order:

```
Argument 1:  --directory
Argument 2:  ~/Projects/vana/mcp-memory-service
Argument 3:  run
Argument 4:  memory
Argument 5:  server
Argument 6:  -s
Argument 7:  sqlite_vec
```

---

## Troubleshooting Checklist

```
□ Augment Code is open
□ Settings panel is visible
□ MCP Servers section is visible
□ Name field shows: memory-service
□ Command field shows: uv
□ All 7 arguments are entered correctly
□ Status shows: ✓ Connected
□ No error messages in console
□ Can store memory in Augment Code
□ Can retrieve memory in Claude Code
```

---

## Quick Reference

| Field | Value |
|-------|-------|
| **Name** | `memory-service` |
| **Command** | `uv` |
| **Arg 1** | `--directory` |
| **Arg 2** | `~/Projects/vana/mcp-memory-service` |
| **Arg 3** | `run` |
| **Arg 4** | `memory` |
| **Arg 5** | `server` |
| **Arg 6** | `-s` |
| **Arg 7** | `sqlite_vec` |

---

## Common Issues & Solutions

### Issue: "Command not found: uv"
```
Solution: Use full path
Command: ~/.local/bin/uv
```

### Issue: "Connection failed"
```
Solution: Verify path
Check: ~/Projects/vana/mcp-memory-service/
       exists and contains src/ directory
```

### Issue: "No memories found"
```
Solution: Verify both tools use same database
Database: ~/Library/Application Support/mcp-memory/sqlite_vec.db
```

---

## Success Indicators

✅ Status shows "✓ Connected"
✅ No error messages in console
✅ Can store memories in Augment Code
✅ Can retrieve memories in Claude Code
✅ Tag-based search works
✅ Both tools access same database

---

## You're Done! 🎉

Once you see "✓ Connected", Augment Code is ready to use with the shared memory system!

**Next**: Start using memories in Augment Code and they'll be accessible in Claude Code too!


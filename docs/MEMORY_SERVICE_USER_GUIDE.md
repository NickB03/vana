# MCP Memory Service - User Guide (Solo Developer)

**TL;DR**: ✅ It's **automatic**. You don't need to do anything. Just work normally.

---

## Quick Answer to Your Questions

### ❓ Do I need to do anything as a user?

**❌ NO.** Everything happens automatically:
- Memories are saved automatically when you finish coding
- Memories are loaded automatically when you start
- Memories are triggered automatically during conversation
- No commands to remember, no manual steps needed

### ❓ Are there any `/commands` I must use?

**❌ NO REQUIRED COMMANDS.**

Optional commands (but you don't need them):
```
/memory-store "Save this idea"          # Manually store something
/memory-recall "search query"           # Manually search
/memory-health                          # Check system status
```

You only use these if you want to manually save something special. Otherwise, it all happens automatically.

### ❓ Does it run in background automatically?

**YES.** Two options:

**Option 1: Manual Start** (Best for development)
```bash
cd ~/Projects/vana/mcp-memory-service
uv run memory server
```
Then just use Claude Code normally. Hooks will find the running service.

**Option 2: Auto-Start with Claude Code** (No manual startup)
Claude hooks automatically launch the MCP server when needed via:
```
"serverCommand": ["uv", "run", "memory", "server", "-s", "sqlite_vec"]
```

### ❓ Does it use Docker?

**❌ NO DOCKER NEEDED.**

It's simple:
- SQLite database stored locally: `~/.mcp_memory/database.db`
- No external services required
- No Docker containers
- Pure Python + local storage

### ❓ What's the embeddings model?

**`all-MiniLM-L6-v2`** (384 dimensions)

Details:
```
Model Name:        all-MiniLM-L6-v2
Provider:          sentence-transformers
Dimensions:        384
Runtime:           ONNX (optimized, fast)
Local Storage:     ~/.cache/mcp_memory/onnx_models/
Download Size:     ~61MB (cached locally)
Performance:       <50ms per embedding
GPU Support:       Yes (auto-detects: CUDA/MPS/ROCm)
Fallback:          CPU if GPU unavailable
```

This model is:
- ✅ Small & fast (384 dims is optimal)
- ✅ Good for code/documentation (trained on diverse text)
- ✅ Cached locally (no cloud calls)
- ✅ Industry standard (used by Chroma DB, LangChain)

---

## Complete User Workflow

### What Happens Automatically

#### 🟢 **Scenario 1: First Time Setup**

```
1. You: Open Claude Code
   → Hooks detect new session
   → Memory service auto-launches (if not running)
   → SessionStart hook queries memory
   → (No memories yet, so starts empty)

2. You: Do work - implement a feature, fix bugs, etc.

3. You: Close Claude Code session
   → SessionEnd hook fires automatically
   → Analyzes your conversation
   → Extracts: What you built, decisions made, problems solved
   → Creates memory automatically
   → Stores in SQLite database

4. Later: Open Claude Code again
   → SessionStart hook fires
   → Queries memory service
   → Finds your previous work summary
   → Injects context automatically
   → You continue from where you left off
```

#### 🟢 **Scenario 2: Mid-Conversation Smart Triggers**

```
You:     "I need to implement OAuth, like we did before"
         ↓
Hook:    Detects pattern → "like we did before" + "OAuth"
         ↓
Memory:  Auto-triggered if confidence >60%
         ↓
Claude:  Gets your previous OAuth decision injected
         ↓
You:     "Oh right, we used JWT tokens with 24h expiry"
         (Memory recalled automatically)
```

---

## Setup Checklist (One-Time Only)

✅ **Already Done For You:**
```
[✓] Memory service installed
[✓] SQLite database created at ~/.mcp_memory/database.db
[✓] Hooks registered in ~/.claude/settings.json
[✓] Configuration file created at ~/.claude/hooks/config.json
[✓] Embeddings model auto-downloads on first run
[✓] Port 8888 configured
[✓] sqlite_vec backend selected
```

✅ **Nothing Else Needed**

---

## Optional: Start Memory Service Manually

If you want to see it running:

```bash
cd ~/Projects/vana/mcp-memory-service
uv run memory server
```

Output:
```
🚀 MCP Memory Service starting...
📊 Storage: SQLite-vec at ~/.mcp_memory/database.db
🧠 Embeddings: all-MiniLM-L6-v2 (384 dims)
🌐 HTTP API: http://127.0.0.1:8888
✅ Ready for connections
```

Then in another terminal:
```bash
# Check it's working
curl http://127.0.0.1:8888/api/health

# Result: {"status": "ok", "memories": 5}
```

---

## Optional: Manual Memory Commands

If you want to manually save something important:

### Store a Memory
```bash
# In your terminal (anywhere)
curl -X POST http://127.0.0.1:8888/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Decided to use WebSockets for real-time sync instead of polling",
    "tags": ["architecture", "decision", "realtime"]
  }'
```

### View All Memories
```bash
curl http://127.0.0.1:8888/api/memories
```

### Search Memories
```bash
curl -X POST http://127.0.0.1:8888/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "WebSocket architecture", "limit": 5}'
```

### Delete a Memory
```bash
# First get the memory hash
curl http://127.0.0.1:8888/api/memories | grep -i websocket

# Then delete it
curl -X DELETE http://127.0.0.1:8888/api/memories/<hash>
```

---

## FAQ

### Q: Will it slow down Claude Code?
**A:** No. Hooks timeout after 8-15 seconds. If service is slow, it degrades gracefully.

### Q: Will it use lots of disk space?
**A:** No. Current setup: ~1.6MB per 5 memories. Years of work = ~100MB max.

### Q: Can I access memories later?
**A:** Yes. Stored in `~/.mcp_memory/database.db` - persistent across sessions.

### Q: What if memory service crashes?
**A:** Claude Code works fine without it. Hooks just skip. Restart with: `uv run memory server`

### Q: Can I export my memories?
**A:** Yes. They're in SQLite. Use any SQLite viewer:
```bash
sqlite3 ~/.mcp_memory/database.db "SELECT content, tags FROM memories;"
```

### Q: What if I want different embeddings model?
**A:** For solo dev, `all-MiniLM-L6-v2` is perfect. Don't change it.

### Q: Will it work on different machines?
**A:** Database is local. Copy `~/.mcp_memory/database.db` to new machine to transfer memories.

### Q: Can I share memories with teammates?
**A:** Yes, but requires setup (Hybrid backend + Cloudflare). Not needed now for solo dev.

---

## Performance Expectations

```
SessionStart Injection:        ~200-500ms
Mid-Conversation Trigger:      ~100-300ms
SessionEnd Consolidation:      ~5-15 seconds (in background)
Embeddings Generation:         <50ms per query
Database Operations:           <10ms for queries
```

All these delays are **imperceptible to you** - they happen in background hooks.

---

## Storage Details

```
Local Storage:
├─ Database:          ~/.mcp_memory/database.db (1.6MB for 5 memories)
├─ Embeddings Cache:  ~/.cache/mcp_memory/onnx_models/ (~61MB one-time download)
└─ No cloud storage:  Everything local

Data Retention:
├─ Automatic:         Indefinite (stored in SQLite)
├─ Manual Delete:     Via API or SQL
└─ Soft Delete:       Configurable via tags
```

---

## What Data is Stored?

```
Each Memory Record Contains:
├─ content: Your conversation/decision/code snippet
├─ tags: Auto-generated (claude-code, session-end, python, etc.)
├─ embeddings: 384-dimensional vector (for semantic search)
├─ created_at: Timestamp
├─ source: Where it came from (SessionEnd, SessionStart, etc.)
├─ relevance_score: How relevant it is (0-1)
└─ metadata: Additional context

NO SENSITIVE DATA:
❌ API keys
❌ Passwords
❌ Personal info
❌ System credentials
(You control what gets stored)
```

---

## Embeddings Explained (For Curious Developers)

### What are embeddings?
Numbers that represent meaning. "Authenticate users" and "OAuth implementation" are similar in embedding space.

### How they work:
```
Text: "Fixed authentication bug using JWT"
      ↓
Model: all-MiniLM-L6-v2
      ↓
Result: 384 numbers: [0.123, -0.456, 0.789, ..., 0.234]
        (These 384 numbers represent the "meaning" of that text)

Later: "How do we handle OAuth?"
      ↓
Model: all-MiniLM-L6-v2 (same model)
      ↓
Result: 384 numbers: [0.111, -0.470, 0.805, ..., 0.220]
        (Similar to the authentication memory)

Comparison: Calculate distance between vectors
           → If distance is small = semantically similar
           → Retrieve as relevant memory!
```

### Why all-MiniLM-L6-v2?
- `all-MiniLM`: Trained on diverse text + code
- `L6`: 6 layers (fast)
- `v2`: Latest version
- `384 dims`: Perfect balance of speed/accuracy for code context

---

## You're All Set! 🎉

**You literally don't need to do anything else.**

Just:
1. ✅ Open Claude Code
2. ✅ Work normally
3. ✅ Close the session

Everything else happens automatically in the background.

---

**Questions?** Check the full docs in:
- `/docs/reviews/MCP_MEMORY_SERVICE_INTEGRATION_REVIEW.md`
- `/docs/reviews/CLAUDE_HOOKS_SETUP_VERIFICATION.md`

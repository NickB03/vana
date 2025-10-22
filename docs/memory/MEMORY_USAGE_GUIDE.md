# Memory Usage Guide: Cline vs Gemini CLI
## How to Actually Use Memory Functions in Each Tool

---

## Quick Answer

| Tool | Method | Automation | User Action |
|------|--------|-----------|-------------|
| **Claude Code** | Automatic | 95% | None - just chat |
| **Gemini CLI** | `/mcp` commands OR wrapper | 70% | Use wrapper script |
| **Cline** | Ask AI OR custom instructions | 60% | Ask Cline to use memory |

---

## Gemini CLI: Two Approaches

### Approach 1: Manual `/mcp` Commands (Manual)

You can explicitly call memory functions using `/mcp` commands:

```bash
# Retrieve memories
/mcp memory-service retrieve_memory query="authentication" n_results=5

# Store a memory
/mcp memory-service store_memory content="Fixed login bug by adding JWT validation" tags=["bug-fix", "auth"]

# Search by tags
/mcp memory-service search_by_tag tags=["authentication", "security"]
```

**Pros**:
- ✅ Explicit control
- ✅ Works immediately
- ✅ No setup needed

**Cons**:
- ❌ Manual - you must remember to call
- ❌ Not automatic
- ❌ Requires typing commands

**Automation Level**: 0% - Fully manual

---

### Approach 2: Wrapper Script (Recommended)

Use the `gemini-with-memory` wrapper script:

```bash
gemini-with-memory "How do I implement OAuth?"
```

**What Happens**:
1. Script automatically retrieves relevant memories
2. Injects them into Gemini CLI context
3. You chat normally with Gemini
4. Script automatically stores session results

**Pros**:
- ✅ Automatic memory retrieval
- ✅ Automatic memory storage
- ✅ Just use wrapper instead of `gemini`

**Cons**:
- ⚠️ Requires wrapper script setup (2-3 hours)
- ⚠️ Still need to use wrapper command

**Automation Level**: 70% - Mostly automatic

---

## Cline: Two Approaches

### Approach 1: Ask Cline to Use Memory (Easiest)

Simply ask Cline to use memory tools:

```
"Before you start, retrieve relevant memories about authentication using the memory-service MCP tool"

"After you're done, store the key decisions to memory"

"Use the memory-service tool to search for memories about database schema"
```

**How It Works**:
1. You add custom instructions to Cline telling it about memory tools
2. You ask Cline to use memory in your prompts
3. Cline calls the memory-service MCP tool
4. Results are automatically stored

**Pros**:
- ✅ No setup required
- ✅ Works immediately
- ✅ Cline is smart enough to use tools

**Cons**:
- ❌ Not automatic - depends on your request
- ❌ Requires you to remember to ask
- ❌ Cline might not always use tools

**Automation Level**: 40% - Semi-automatic (depends on user prompts)

---

### Approach 2: VS Code Tasks (More Automatic)

Use VS Code tasks to automatically manage memories:

```bash
# Run task: "Cline with Memory"
# This automatically:
# 1. Retrieves memories before Cline opens
# 2. Stores session results after you close
```

**How It Works**:
1. Create `.vscode/tasks.json` with pre/post hooks
2. Run task instead of opening Cline directly
3. Memories automatically retrieved and stored

**Pros**:
- ✅ Automatic pre/post execution
- ✅ No manual commands needed
- ✅ Integrated with VS Code

**Cons**:
- ⚠️ Requires setup (3-4 hours)
- ⚠️ Still need to use task instead of Cline directly
- ⚠️ Cline doesn't know about memories mid-session

**Automation Level**: 60% - Semi-automatic (pre/post automatic, mid-session manual)

---

## Recommended Usage Patterns

### For Gemini CLI

**Best Practice**: Use wrapper script + ask for memory when needed

```bash
# Start with wrapper (automatic memory retrieval)
gemini-with-memory "How do I implement OAuth?"

# During conversation, explicitly ask for more memories
/mcp memory-service retrieve_memory query="JWT tokens" n_results=3

# Session automatically stored when done
```

**Result**: 70% automation + manual control when needed

---

### For Cline

**Best Practice**: Add custom instructions + ask in prompts

**Step 1**: Add to Cline Custom Instructions

```
You have access to a shared memory system via MCP Memory Service.

When the user asks you to:
- "retrieve memories about X" → Use retrieve_memory tool
- "store this decision" → Use store_memory tool
- "search for X" → Use search_by_tag tool

Available MCP Tools:
- retrieve_memory: Get relevant memories
- store_memory: Save new memories
- search_by_tag: Find memories by tags
- recall_memory: Time-based retrieval
```

**Step 2**: Ask Cline to use memory

```
"Before implementing this feature, retrieve memories about similar features we've built"

"After you're done, store the key architectural decisions to memory"

"Search for memories about error handling patterns"
```

**Result**: 40-60% automation depending on your prompts

---

## Comparison: Manual vs Automatic

### Manual Approach (0% Automation)

```
You: "Gemini, retrieve memories about authentication"
Gemini: /mcp memory-service retrieve_memory query="authentication"
You: Read memories
You: "Store this decision"
Gemini: /mcp memory-service store_memory content="..."
```

**Effort**: High - You must remember and ask  
**Automation**: 0%

---

### Semi-Automatic Approach (40-60% Automation)

```
You: "Cline, implement OAuth with memory awareness"
Cline: (Custom instructions tell it to use memory)
Cline: /mcp memory-service retrieve_memory query="OAuth"
Cline: Implements feature
Cline: /mcp memory-service store_memory content="..."
```

**Effort**: Low - Just ask normally  
**Automation**: 40-60%

---

### Fully Automatic Approach (70-95% Automation)

```
You: gemini-with-memory "implement OAuth"
Script: (Pre-hook) Retrieves memories automatically
Gemini: Sees memories in context
You: Chat normally
Script: (Post-hook) Stores session automatically
```

**Effort**: Minimal - Just use wrapper  
**Automation**: 70-95%

---

## Decision Matrix

### When to Use Each Approach

**Gemini CLI**:

```
Do you want maximum automation?
├─ YES → Use wrapper script (70% automation)
│        gemini-with-memory "query"
│
└─ NO → Use /mcp commands (0% automation)
         /mcp memory-service retrieve_memory query="..."
```

**Cline**:

```
Do you want to set it up once?
├─ YES → Add custom instructions (40-60% automation)
│        Then just ask Cline to use memory
│
└─ NO → Use /mcp commands manually (0% automation)
         Ask Cline: "Use memory-service to retrieve..."
```

---

## Real-World Examples

### Gemini CLI Example

**Without Wrapper**:
```bash
$ gemini
> /mcp memory-service retrieve_memory query="database schema"
> [memories appear]
> How do I add a new table?
> [Gemini responds]
> /mcp memory-service store_memory content="Added user_roles table"
```

**With Wrapper**:
```bash
$ gemini-with-memory "How do I add a new table?"
[Memories automatically injected]
[Gemini responds with context]
[Session automatically stored]
```

---

### Cline Example

**Without Custom Instructions**:
```
You: "Implement authentication"
Cline: [Implements without memory context]
You: "Store this to memory"
Cline: [Manually stores]
```

**With Custom Instructions**:
```
You: "Implement authentication and use memory for context"
Cline: [Retrieves memories automatically]
Cline: [Implements with context]
Cline: [Stores automatically]
```

---

## Summary

### Gemini CLI
- **Manual**: Use `/mcp` commands (0% automation)
- **Automatic**: Use wrapper script (70% automation) ✅ Recommended
- **Hybrid**: Use wrapper + manual `/mcp` commands when needed

### Cline
- **Manual**: Ask Cline to use `/mcp` commands (0% automation)
- **Semi-Automatic**: Add custom instructions + ask in prompts (40-60% automation) ✅ Recommended
- **More Automatic**: Use VS Code tasks (60% automation)

### Claude Code
- **Fully Automatic**: Native hooks (95% automation) ✅ Already done

---

## Next Steps

1. **For Gemini CLI**: Decide between manual `/mcp` commands or wrapper script
2. **For Cline**: Add custom instructions and ask Cline to use memory
3. **For Claude Code**: Already automatic - just use normally

**Recommendation**: Use wrapper for Gemini CLI (70% automation) + custom instructions for Cline (40-60% automation) for best experience.


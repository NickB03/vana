# Memory Quick Reference Card
## How to Use Memory Functions - At a Glance

---

## Claude Code ✅ (Already Working)

### Just Chat Normally
```
You: "Help me implement authentication"
Claude: [Automatically retrieves relevant memories]
Claude: [Responds with context]
Claude: [Automatically stores insights]
```

**Automation**: 95% - Fully automatic  
**Your Action**: None - just chat

---

## Gemini CLI ⚠️

### Option 1: Manual Commands (0% Automation)

```bash
# Retrieve memories
/mcp memory-service retrieve_memory query="authentication" n_results=5

# Store memory
/mcp memory-service store_memory content="Fixed login bug" tags=["bug-fix"]

# Search by tags
/mcp memory-service search_by_tag tags=["authentication"]
```

**When to Use**: When you want explicit control  
**Automation**: 0%

---

### Option 2: Wrapper Script (70% Automation) ✅ Recommended

```bash
# Instead of:
gemini "How do I implement OAuth?"

# Use:
gemini-with-memory "How do I implement OAuth?"
```

**What Happens**:
1. ✅ Memories automatically retrieved
2. ✅ Injected into context
3. ✅ You chat normally
4. ✅ Session automatically stored

**Automation**: 70%  
**Setup**: 2-3 hours (one-time)

---

## Cline ⚠️

### Option 1: Ask Cline to Use Memory (40-60% Automation) ✅ Recommended

**Add to Cline Custom Instructions**:
```
You have access to memory-service MCP tool.
When asked, use it to retrieve/store memories.
```

**Then Ask Cline**:
```
"Retrieve memories about authentication before implementing"

"Store the key decisions to memory when done"

"Search for memories about error handling"
```

**Automation**: 40-60% (depends on your prompts)  
**Setup**: 5 minutes

---

### Option 2: Manual `/mcp` Commands (0% Automation)

```
You: "Use memory-service to retrieve memories about authentication"
Cline: /mcp memory-service retrieve_memory query="authentication"
```

**Automation**: 0%  
**Setup**: None

---

### Option 3: VS Code Tasks (60% Automation)

```bash
# Run VS Code task: "Cline with Memory"
# Automatically:
# 1. Retrieves memories before Cline opens
# 2. Stores session results after you close
```

**Automation**: 60%  
**Setup**: 3-4 hours

---

## Augment Code ❌

### Manual Memory Tool Usage Only

```
You: Use the memory-service MCP tool to retrieve memories
Augment: [Manually calls tool]
```

**Automation**: 0%  
**Setup**: None (but not automatic)

---

## Memory Commands Reference

### Retrieve Memories
```bash
/mcp memory-service retrieve_memory query="your query" n_results=5
```

### Store Memory
```bash
/mcp memory-service store_memory content="your content" tags=["tag1", "tag2"]
```

### Search by Tags
```bash
/mcp memory-service search_by_tag tags=["tag1", "tag2"]
```

### Recall by Time
```bash
/mcp memory-service recall_memory query="your query" timeframe="last week"
```

### Check Database Health
```bash
/mcp memory-service check_database_health
```

---

## Recommended Setup

### For Maximum Automation (70-95%)

**Claude Code**: ✅ Already done
- Automation: 95%
- Action: Just chat

**Gemini CLI**: Use wrapper script
- Automation: 70%
- Action: `gemini-with-memory "query"`

**Cline**: Add custom instructions
- Automation: 40-60%
- Action: Ask Cline to use memory

---

## Decision Tree

### Gemini CLI

```
Want automatic memory?
├─ YES → Use wrapper script
│        gemini-with-memory "query"
│        Automation: 70%
│
└─ NO → Use /mcp commands manually
         /mcp memory-service retrieve_memory query="..."
         Automation: 0%
```

### Cline

```
Want automatic memory?
├─ YES → Add custom instructions
│        Ask Cline to use memory
│        Automation: 40-60%
│
└─ NO → Use /mcp commands manually
         Ask Cline: "Use memory-service to..."
         Automation: 0%
```

### Claude Code

```
Memory is automatic!
Just chat normally.
Automation: 95%
```

---

## Common Tasks

### "I want to remember this decision"

**Claude Code**:
```
Just chat - automatically stored
```

**Gemini CLI**:
```
/mcp memory-service store_memory content="decision" tags=["decision"]
```

**Cline**:
```
"Store this decision to memory"
(Cline uses memory-service tool)
```

---

### "Show me relevant memories"

**Claude Code**:
```
"Show me relevant memories about X"
(Automatically retrieved)
```

**Gemini CLI**:
```
/mcp memory-service retrieve_memory query="X" n_results=5
```

**Cline**:
```
"Retrieve memories about X"
(Cline uses memory-service tool)
```

---

### "Find memories with specific tags"

**Claude Code**:
```
"Find memories tagged with X"
(Automatically searched)
```

**Gemini CLI**:
```
/mcp memory-service search_by_tag tags=["tag1", "tag2"]
```

**Cline**:
```
"Search for memories tagged with X"
(Cline uses memory-service tool)
```

---

## Automation Levels

| Tool | Automation | Setup | User Action |
|------|-----------|-------|-------------|
| Claude Code | 95% | Done | None |
| Gemini CLI (wrapper) | 70% | 2-3h | Use wrapper |
| Cline (instructions) | 40-60% | 5m | Ask Cline |
| Gemini CLI (manual) | 0% | None | Type commands |
| Cline (manual) | 0% | None | Ask Cline |
| Augment Code | 0% | None | Manual tools |

---

## Pro Tips

1. **Claude Code**: Just chat normally - it handles everything
2. **Gemini CLI**: Use wrapper script for best experience
3. **Cline**: Add custom instructions once, then ask naturally
4. **All Tools**: Share the same memory database - no duplication

---

## Troubleshooting

### Memory not appearing?
- Check MCP service is running: `curl http://127.0.0.1:8889/api/health`
- Verify memory-service is configured in tool settings
- Try manual `/mcp` command to test

### Commands not working?
- Make sure you're using `/mcp` prefix in Gemini CLI
- Verify memory-service MCP is enabled in tool settings
- Check tool documentation for correct syntax

### Memories not storing?
- Verify MCP service is running
- Check API key is set (if required)
- Try manual store command to test

---

**Last Updated**: October 20, 2025


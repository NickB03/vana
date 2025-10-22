# Memory Hooks Comparison Matrix
## Visual Guide to Hook Capabilities Across All Tools

---

## Feature Comparison

### Pre-Execution Hooks (Memory Retrieval)

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Tool            │ Native   │ Protocol │ Automatic│ Effort   │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Claude Code     │ ✅ Yes   │ Hooks    │ ✅ 95%   │ Done     │
│ Gemini CLI      │ ❌ No    │ MCP      │ ⚠️ 70%   │ 2-3h     │
│ Cline           │ ❌ No    │ Custom   │ ⚠️ 50%   │ 3-4h     │
│ Augment Code    │ ❌ No    │ None     │ ❌ 0%    │ N/A      │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

### Post-Execution Hooks (Memory Storage)

```
┌─────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Tool            │ Native   │ Protocol │ Automatic│ Effort   │
├─────────────────┼──────────┼──────────┼──────────┼──────────┤
│ Claude Code     │ ✅ Yes   │ Hooks    │ ✅ 95%   │ Done     │
│ Gemini CLI      │ ❌ No    │ MCP      │ ⚠️ 70%   │ 2-3h     │
│ Cline           │ ❌ No    │ Custom   │ ⚠️ 50%   │ 3-4h     │
│ Augment Code    │ ❌ No    │ None     │ ❌ 0%    │ N/A      │
└─────────────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## Implementation Methods

### Claude Code: Native Hooks ✅

```
Session Start
    ↓
[Hook: session-start.js]
    ├─ Detect project context
    ├─ Query MCP Memory Service
    ├─ Score memories by relevance
    └─ Inject into system context
    ↓
Claude Code Session
    ↓
[Hook: session-end.js]
    ├─ Analyze conversation
    ├─ Extract key insights
    └─ Store to MCP Memory Service
    ↓
Session End
```

**Status**: ✅ Production-Ready  
**Automation**: 95%  
**Configuration**: `~/.claude/hooks/config.json`

---

### Gemini CLI: Wrapper Script ⚠️

```
User Command: gemini-with-memory "query"
    ↓
[Pre-Execution Hook]
    ├─ Retrieve memories from MCP
    ├─ Format as context
    └─ Prepare for injection
    ↓
Gemini CLI Execution
    ├─ User can call MCP tools manually
    └─ Or use injected context
    ↓
[Post-Execution Hook]
    ├─ Capture output
    ├─ Extract insights
    └─ Store to MCP Memory Service
    ↓
Session Complete
```

**Status**: 📋 Ready to Implement  
**Automation**: 70%  
**Implementation**: Shell wrapper script  
**Effort**: 2-3 hours

---

### Cline: Custom Instructions + Tasks ⚠️

```
VS Code Task: "Cline with Memory"
    ↓
[Pre-Task Hook]
    ├─ Retrieve memories
    └─ Store in .cline-memory-context
    ↓
Cline Extension Opens
    ├─ Custom instructions tell Cline about memories
    ├─ Cline can use memory-service MCP tools
    └─ User manually invokes memory tools
    ↓
[Post-Task Hook]
    ├─ Capture Cline output
    ├─ Extract insights
    └─ Store to MCP Memory Service
    ↓
Session Complete
```

**Status**: 📋 Ready to Implement  
**Automation**: 60%  
**Implementation**: VS Code tasks + custom instructions  
**Effort**: 3-4 hours

---

### Augment Code: Manual Only ❌

```
Augment Code Session
    ↓
User manually calls:
    ├─ /mcp memory-service retrieve_memory
    ├─ /mcp memory-service store_memory
    └─ /mcp memory-service search_by_tag
    ↓
Session Complete
```

**Status**: ❌ Not Supported  
**Automation**: 0%  
**Implementation**: Manual memory tool usage  
**Effort**: Not recommended

---

## Hook Lifecycle Comparison

### Claude Code (Native)

```
Timeline:
├─ T0: Session Start
│  └─ [Hook] session-start.js runs
│     └─ Memories injected
├─ T1-Tn: Session Active
│  ├─ [Hook] mid-conversation.js monitors
│  ├─ [Hook] topic-change.js detects shifts
│  └─ [Hook] memory-retrieval.js on-demand
├─ Tn+1: Session End
│  └─ [Hook] session-end.js runs
│     └─ Memories stored
└─ T∞: Session Complete

Automation: Fully automatic
User Interaction: None required
```

### Gemini CLI (Wrapper)

```
Timeline:
├─ T0: User runs gemini-with-memory
│  └─ [Script] Pre-hook runs
│     └─ Memories retrieved
├─ T1-Tn: Gemini CLI Active
│  └─ User can manually use MCP tools
├─ Tn+1: User exits Gemini CLI
│  └─ [Script] Post-hook runs
│     └─ Memories stored
└─ T∞: Session Complete

Automation: 70% (pre/post automatic, mid-session manual)
User Interaction: Minimal (use wrapper instead of gemini)
```

### Cline (Tasks)

```
Timeline:
├─ T0: User runs VS Code task
│  └─ [Task] Pre-hook runs
│     └─ Memories retrieved
├─ T1-Tn: Cline Active
│  └─ User manually calls memory tools
├─ Tn+1: User closes VS Code
│  └─ [Task] Post-hook runs
│     └─ Memories stored
└─ T∞: Session Complete

Automation: 60% (pre/post automatic, mid-session manual)
User Interaction: Moderate (use task, manual tool calls)
```

---

## Configuration Complexity

### Claude Code: Simple ✅

```json
{
  "memoryService": {
    "endpoint": "http://127.0.0.1:8889",
    "maxMemoriesPerSession": 8
  },
  "memoryScoring": {
    "weights": {
      "timeDecay": 0.40,
      "tagRelevance": 0.25
    }
  }
}
```

**Complexity**: Low  
**Setup Time**: 15 minutes  
**Maintenance**: Minimal

---

### Gemini CLI: Moderate ⚠️

```bash
# 1. Create wrapper script
~/.local/bin/gemini-with-memory

# 2. Configure MCP endpoint
MCP_ENDPOINT="http://127.0.0.1:8889"

# 3. Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# 4. Create alias
alias gemini-mem="gemini-with-memory"
```

**Complexity**: Moderate  
**Setup Time**: 1-2 hours  
**Maintenance**: Low

---

### Cline: Complex ⚠️

```
1. Create .vscode/tasks.json
2. Create scripts/retrieve-memories.js
3. Create scripts/store-session.js
4. Add custom instructions to Cline
5. Bind tasks to keyboard shortcuts
6. Test integration
```

**Complexity**: High  
**Setup Time**: 2-3 hours  
**Maintenance**: Moderate

---

## Memory Scoring Algorithm

All tools use the same scoring (from Claude Code):

```
Final Score = (
  timeDecayScore × 0.40 +
  tagRelevanceScore × 0.25 +
  contentRelevanceScore × 0.15 +
  contentQualityScore × 0.20 +
  typeBonus +
  recencyBonus
) × gitContextWeight

Clamped to [0, 1]
```

**Result**: Consistent memory ranking across all tools

---

## Shared Database

```
All Tools
    ↓
MCP Memory Service
    ↓
SQLite-vec Database
    ├─ Location: ~/Library/Application Support/mcp-memory/sqlite_vec.db
    ├─ Embeddings: ONNX (384-dimensional)
    ├─ Concurrency: WAL mode enabled
    └─ Consistency: Automatic
```

**Benefit**: No duplication, seamless cross-tool access

---

## Implementation Priority

### Phase 1: Verify Claude Code ✅
- Status: Complete
- Automation: 95%
- Effort: Done

### Phase 2: Implement Gemini CLI 📋
- Status: Ready
- Automation: 70%
- Effort: 2-3 hours
- **Recommendation**: Implement next

### Phase 3: Implement Cline 📋
- Status: Ready
- Automation: 60%
- Effort: 3-4 hours
- **Recommendation**: Optional

### Phase 4: Document Augment Code ❌
- Status: Not feasible
- Automation: 0%
- Effort: Not recommended

---

## Success Metrics

| Metric | Target | Claude Code | Gemini CLI | Cline | Augment |
|--------|--------|-------------|-----------|-------|---------|
| Pre-Execution Automation | 80%+ | ✅ 95% | ⚠️ 70% | ⚠️ 50% | ❌ 0% |
| Post-Execution Automation | 80%+ | ✅ 95% | ⚠️ 70% | ⚠️ 50% | ❌ 0% |
| Memory Consistency | 100% | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Cross-Tool Access | 100% | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Setup Complexity | Low | ✅ Low | ⚠️ Mod | ⚠️ High | ✅ N/A |

---

## Recommendation

**Implement in this order**:

1. ✅ **Claude Code** (Already done)
2. 📋 **Gemini CLI** (Next - highest ROI)
3. 📋 **Cline** (Optional - if needed)
4. ❌ **Augment Code** (Not recommended)

**Expected Result**: 70-95% automation across all tools with shared memory database.

---

**Last Updated**: October 20, 2025


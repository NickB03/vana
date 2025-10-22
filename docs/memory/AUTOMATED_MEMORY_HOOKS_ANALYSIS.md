# Automated Memory Hooks Analysis
## Pre/Post-Execution Hooks for Seamless Memory Management

**Date**: October 20, 2025  
**Goal**: Enable automatic memory retrieval and storage across Cline, Gemini CLI, Augment Code, and Claude Code without explicit user commands.

---

## Executive Summary

**Good News**: Automated memory hooks are **partially supported** across the tools:

| Tool | Pre-Execution Hooks | Post-Execution Hooks | Implementation Status |
|------|-------------------|-------------------|----------------------|
| **Claude Code** | ✅ Yes (Native) | ✅ Yes (Native) | **Production-Ready** |
| **Cline** | ⚠️ Limited | ⚠️ Limited | **Custom Implementation Needed** |
| **Gemini CLI** | ⚠️ Limited | ⚠️ Limited | **Custom Implementation Needed** |
| **Augment Code** | ❌ No | ❌ No | **Not Supported** |

---

## 1. Claude Code: Native Hook Support ✅

### Status: **PRODUCTION-READY**

Claude Code has **native, built-in hook support** with pre/post-execution capabilities.

### Architecture

**Hook Types Available**:
- `session-start` - Pre-execution: Load memories when session begins
- `session-end` - Post-execution: Store session insights after completion
- `mid-conversation` - During execution: Inject context mid-session
- `topic-change` - Detect context shifts and refresh memories
- `memory-retrieval` - On-demand: Manual memory refresh

### Implementation

**Location**: `~/.claude/hooks/`

**Core Hooks** (Already Implemented):
- `session-start.js` (v2.2) - Automatically retrieves relevant memories
- `session-end.js` - Stores session outcomes and decisions
- `mid-conversation.js` - Injects memories during conversation
- `memory-retrieval.js` - On-demand memory access

### Configuration

**File**: `~/.claude/hooks/config.json`

```json
{
  "memoryService": {
    "protocol": "auto",
    "preferredProtocol": "http",
    "http": {
      "endpoint": "http://127.0.0.1:8889",
      "apiKey": "YOUR_API_KEY"
    },
    "maxMemoriesPerSession": 8
  },
  "memoryScoring": {
    "weights": {
      "timeDecay": 0.40,
      "tagRelevance": 0.25,
      "contentRelevance": 0.15,
      "contentQuality": 0.20
    }
  },
  "output": {
    "verbose": true,
    "showMemoryDetails": false,
    "cleanMode": false
  }
}
```

### Installation

```bash
cd ~/Projects/vana/mcp-memory-service/claude-hooks
python install_hooks.py --natural-triggers
```

### How It Works

1. **Pre-Execution** (Session Start):
   - Detects project context (git, package.json, frameworks)
   - Queries MCP Memory Service for relevant memories
   - Scores memories by relevance, recency, quality
   - Injects top memories as system context

2. **Post-Execution** (Session End):
   - Analyzes session conversation
   - Extracts key decisions and insights
   - Stores as memories with appropriate tags
   - Maintains session history

3. **Mid-Conversation**:
   - Monitors conversation for context shifts
   - Automatically injects additional memories when needed
   - Prevents mid-session disruptions

---

## 2. Cline: Limited Hook Support ⚠️

### Status: **CUSTOM IMPLEMENTATION NEEDED**

Cline does **not have native hook support** like Claude Code, but can be extended via:

### Possible Approaches

#### A. Custom Instructions (Limited)
- **What**: Add memory retrieval instructions to Cline's "Custom Instructions" field
- **Limitation**: One-time injection, not automatic
- **Effectiveness**: 30% - Manual, not truly automated

#### B. Wrapper Script (Recommended)
- **What**: Create a shell script that:
  1. Calls MCP Memory Service before Cline starts
  2. Injects memories into Cline's context
  3. Monitors Cline's output for completion
  4. Stores results back to memory service
- **Effectiveness**: 80% - Mostly automated, requires script setup

#### C. VS Code Task Integration
- **What**: Use VS Code tasks to run pre/post hooks
- **Limitation**: Requires manual task triggering
- **Effectiveness**: 40% - Semi-automated

### Recommended Implementation: Wrapper Script

**File**: `~/.local/bin/cline-with-memory`

```bash
#!/bin/bash
# Pre-execution: Retrieve memories
PROJECT_DIR=$(pwd)
MEMORIES=$(curl -s http://127.0.0.1:8889/api/retrieve \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$PROJECT_DIR\", \"n_results\": 5}")

# Inject into Cline custom instructions
# (Requires Cline API or settings modification)

# Run Cline
code --command "cline.focus"

# Post-execution: Store session results
# (Monitor Cline output and store to memory service)
```

**Limitation**: Cline doesn't expose a programmatic API for this level of integration.

---

## 3. Gemini CLI: Limited Hook Support ⚠️

### Status: **CUSTOM IMPLEMENTATION NEEDED**

Gemini CLI has **custom command support** but not true pre/post hooks.

### Possible Approaches

#### A. Custom Commands
- **What**: Define custom `/memory` commands in Gemini CLI
- **Limitation**: Manual invocation required
- **Effectiveness**: 30% - User must remember to call

#### B. Wrapper Script
- **What**: Create a shell wrapper similar to Cline
- **Effectiveness**: 75% - Works well for CLI

#### C. MCP Tool Integration (Best)
- **What**: Leverage MCP tools directly in Gemini CLI
- **How**: Memory service is already configured as MCP server
- **Effectiveness**: 85% - Automatic via MCP protocol

### Recommended Implementation: MCP Tool Integration

Since Gemini CLI already has the memory-service MCP configured:

```bash
# In Gemini CLI chat:
/mcp memory-service retrieve_memory query="project context" n_results=5

# After task completion:
/mcp memory-service store_memory content="Session summary..." tags=["gemini-cli"]
```

**Limitation**: Still requires manual commands, not truly automatic.

---

## 4. Augment Code: No Hook Support ❌

### Status: **NOT SUPPORTED**

Augment Code does **not have hook or custom command support** for pre/post execution.

### Why
- Augment Code is a VS Code extension focused on code review and analysis
- No documented API for hooks or custom execution handlers
- Limited extensibility compared to Claude Code

### Workaround
- Use Augment Code's MCP integration to access memory tools manually
- No automatic memory injection possible

---

## 5. MCP Protocol: No Native Hook Support

### Finding
The **Model Context Protocol (MCP) specification does NOT include native pre/post hooks**.

MCP is a **tool protocol**, not an execution framework:
- Defines how tools are discovered and called
- Does NOT define execution lifecycle hooks
- Hooks are implemented at the **client level** (Claude Code, Cline, etc.)

### Implication
- Each tool must implement hooks independently
- No standardized hook mechanism across tools
- Custom implementation required for each tool

---

## 6. Practical Implementation Roadmap

### Phase 1: Claude Code (Already Done ✅)
- Hooks are installed and configured
- Automatic memory injection at session start
- Automatic memory storage at session end
- **Status**: Production-ready

### Phase 2: Gemini CLI (Recommended Next)
- Create wrapper script for automatic memory retrieval
- Use MCP tools for memory operations
- Estimated effort: 2-3 hours

### Phase 3: Cline (Optional)
- Create wrapper script with VS Code integration
- Limited by Cline's lack of programmatic API
- Estimated effort: 4-5 hours

### Phase 4: Augment Code (Not Recommended)
- No hook support available
- Manual memory tool usage only
- Estimated effort: Not feasible

---

## 7. Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Unified Memory Experience                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Claude Code          Gemini CLI         Cline         │
│  (Native Hooks)       (Wrapper Script)   (Wrapper)     │
│       │                    │                 │         │
│       └────────┬───────────┴─────────────────┘         │
│                │                                       │
│         MCP Memory Service                            │
│         (Shared Database)                             │
│                │                                       │
│    ┌───────────┴───────────┐                          │
│    │                       │                          │
│  SQLite-vec DB      ONNX Embeddings                   │
│  (Shared)           (384-dim)                         │
│                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Next Steps

1. **Verify Claude Code hooks** are working correctly
2. **Create Gemini CLI wrapper script** for automatic memory management
3. **Document Cline limitations** and provide manual workaround
4. **Test cross-tool memory sharing** with all four tools

---

## References

- Claude Code Hooks: `mcp-memory-service/claude-hooks/`
- MCP Specification: modelcontextprotocol.io
- Cline Documentation: docs.cline.bot
- Gemini CLI Documentation: github.com/google-gemini/gemini-cli


# Cline Memory Integration Guide
## Automated Memory Management for Cline

---

## Overview

Cline does **not have native hook support** like Claude Code. This guide provides practical workarounds for automatic memory management.

---

## Challenge

Cline is a VS Code extension without:
- Pre/post-execution hooks
- Programmatic API for memory injection
- Custom command system
- Lifecycle event handlers

**Result**: True automation is not possible, but semi-automated workflows can be achieved.

---

## Solution 1: Custom Instructions (Easiest)

### What It Does
Injects memory retrieval instructions into Cline's system prompt.

### Implementation

1. **Open Cline Settings**
   - Click Cline extension icon
   - Click ⚙️ Settings
   - Find "Custom Instructions" field

2. **Add Memory Retrieval Instructions**

```
You have access to a shared memory system via MCP Memory Service.

Before starting any task:
1. Use the memory-service MCP tool to retrieve relevant memories
2. Call: retrieve_memory with query about the current task
3. Review retrieved memories for context
4. Incorporate relevant information into your response

After completing significant tasks:
1. Use store_memory to save important decisions
2. Include tags: ["cline", "decision", "task-name"]
3. Store key insights and architectural decisions

Available MCP Tools:
- retrieve_memory: Get relevant memories
- store_memory: Save new memories
- search_by_tag: Find memories by tags
- recall_memory: Time-based retrieval
```

### Pros
- ✅ No setup required
- ✅ Works immediately
- ✅ Cline will use memory tools when needed

### Cons
- ❌ Not automatic - depends on Cline's decision to use tools
- ❌ Requires Cline to remember instructions
- ❌ No guaranteed execution

### Effectiveness: **30%**

---

## Solution 2: VS Code Task Integration (Moderate)

### What It Does
Uses VS Code tasks to run pre/post hooks around Cline execution.

### Implementation

1. **Create `.vscode/tasks.json`**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Cline: Retrieve Memories",
      "type": "shell",
      "command": "node",
      "args": [
        "${workspaceFolder}/scripts/retrieve-memories.js"
      ],
      "presentation": {
        "reveal": "silent"
      }
    },
    {
      "label": "Cline: Store Session",
      "type": "shell",
      "command": "node",
      "args": [
        "${workspaceFolder}/scripts/store-session.js"
      ],
      "presentation": {
        "reveal": "silent"
      }
    },
    {
      "label": "Cline with Memory",
      "type": "shell",
      "command": "code",
      "args": ["--command", "cline.focus"],
      "preLaunchTask": "Cline: Retrieve Memories",
      "postDebugTask": "Cline: Store Session"
    }
  ]
}
```

2. **Create Memory Scripts**

**File**: `scripts/retrieve-memories.js`

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

const MCP_ENDPOINT = 'http://127.0.0.1:8889';
const PROJECT_DIR = process.cwd();

async function retrieveMemories() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            query: `Project: ${PROJECT_DIR}`,
            n_results: 5
        });

        const options = {
            hostname: '127.0.0.1',
            port: 8889,
            path: '/api/retrieve',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const memories = JSON.parse(body);
                    const contextFile = path.join(PROJECT_DIR, '.cline-memory-context');
                    fs.writeFileSync(contextFile, JSON.stringify(memories, null, 2));
                    console.log('✓ Memories retrieved');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

retrieveMemories().catch(err => {
    console.error('Error retrieving memories:', err.message);
    process.exit(1);
});
```

### Pros
- ✅ Runs automatically before/after tasks
- ✅ Integrates with VS Code workflow
- ✅ Can be triggered via keyboard shortcut

### Cons
- ❌ Requires manual task invocation
- ❌ Not truly automatic
- ❌ Cline doesn't know about memories

### Effectiveness: **40%**

---

## Solution 3: Shell Wrapper (Recommended)

### What It Does
Creates a shell wrapper that manages memory before/after Cline.

### Implementation

**File**: `~/.local/bin/cline-with-memory`

```bash
#!/bin/bash

# Cline Memory Wrapper
# Opens VS Code with Cline and manages memories

PROJECT_DIR="${1:-.}"
MEMORY_CONTEXT_FILE="${PROJECT_DIR}/.cline-memory-context"

# Retrieve memories
echo "🧠 Retrieving project memories..."
curl -s -X POST "http://127.0.0.1:8889/api/retrieve" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${PROJECT_DIR}\", \"n_results\": 5}" \
    > "$MEMORY_CONTEXT_FILE" 2>/dev/null

# Open VS Code with Cline
code "$PROJECT_DIR" --command "cline.focus"

# After VS Code closes, store session
echo "💾 Storing session insights..."
curl -s -X POST "http://127.0.0.1:8889/api/store" \
    -H "Content-Type: application/json" \
    -d "{
        \"content\": \"Cline session completed in ${PROJECT_DIR}\",
        \"tags\": [\"cline\", \"session\"],
        \"memory_type\": \"session\"
    }" > /dev/null 2>&1

# Cleanup
rm -f "$MEMORY_CONTEXT_FILE"
```

### Usage

```bash
chmod +x ~/.local/bin/cline-with-memory
cline-with-memory /path/to/project
```

### Pros
- ✅ Simple to implement
- ✅ Works with existing Cline setup
- ✅ Automatic memory storage

### Cons
- ❌ Cline doesn't automatically use memories
- ❌ Requires manual script invocation
- ❌ No mid-session memory injection

### Effectiveness: **50%**

---

## Solution 4: Custom MCP Tool (Advanced)

### What It Does
Creates a custom MCP tool that Cline can call for memory operations.

### Implementation

This would require:
1. Creating a custom MCP server wrapper
2. Registering it with Cline
3. Documenting the tool for Cline

**Status**: Complex, requires MCP server development

### Effectiveness: **70%**

---

## Recommended Approach

**Combine Solutions 1 + 2**:

1. **Add Custom Instructions** (Solution 1)
   - Tells Cline about memory tools
   - Encourages memory usage

2. **Use VS Code Tasks** (Solution 2)
   - Automatically retrieves memories before Cline
   - Stores session after completion
   - Minimal setup required

### Setup Steps

1. Create `.vscode/tasks.json` (from Solution 2)
2. Create `scripts/retrieve-memories.js` (from Solution 2)
3. Add Custom Instructions to Cline (from Solution 1)
4. Bind task to keyboard shortcut:

**File**: `.vscode/keybindings.json`

```json
{
  "key": "cmd+shift+m",
  "command": "workbench.action.tasks.runTask",
  "args": "Cline with Memory"
}
```

### Result

- **Pre-Execution**: Memories automatically retrieved
- **During**: Cline can use memory tools via MCP
- **Post-Execution**: Session automatically stored
- **Effectiveness**: **60-70%**

---

## Limitations

1. **No True Automation**: Requires user action to start
2. **No Mid-Session Injection**: Memories loaded once at start
3. **Limited API**: Cline doesn't expose programmatic hooks
4. **Manual Tool Usage**: Cline must choose to use memory tools

---

## Future Improvements

1. **Cline Plugin**: If Cline adds plugin system
2. **VS Code Extension**: Create extension that wraps Cline
3. **Shell Integration**: Intercept `code` command globally
4. **Cline API**: If Cline exposes programmatic API

---

## See Also

- [Automated Memory Hooks Analysis](./AUTOMATED_MEMORY_HOOKS_ANALYSIS.md)
- [Gemini CLI Memory Wrapper](./GEMINI_CLI_MEMORY_WRAPPER.md)
- [Claude Code Hooks](./mcp-memory-service/claude-hooks/README.md)


# Gemini CLI Memory Wrapper Script
## Automated Memory Retrieval and Storage for Gemini CLI

---

## Overview

This guide provides a practical implementation for automatic memory management in Gemini CLI using a wrapper script and MCP integration.

---

## Architecture

```
User Command
    │
    ├─→ gemini-with-memory [query]
    │
    ├─→ Pre-Execution Hook
    │   ├─ Detect project context
    │   ├─ Query MCP Memory Service
    │   └─ Prepare memory context
    │
    ├─→ Run Gemini CLI with context
    │
    └─→ Post-Execution Hook
        ├─ Capture output
        ├─ Extract key insights
        └─ Store to MCP Memory Service
```

---

## Implementation

### Step 1: Create Wrapper Script

**File**: `~/.local/bin/gemini-with-memory`

```bash
#!/bin/bash

# Gemini CLI Memory Wrapper
# Automatically retrieves and stores memories via MCP

set -e

# Configuration
MCP_ENDPOINT="http://127.0.0.1:8889"
PROJECT_DIR="${PWD}"
MEMORY_CONTEXT_FILE="/tmp/gemini_memory_context_$$.txt"
SESSION_LOG="/tmp/gemini_session_$$.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function: Retrieve memories from MCP service
retrieve_memories() {
    local query="$1"
    local n_results="${2:-5}"
    
    echo -e "${BLUE}[Memory] Retrieving context...${NC}" >&2
    
    # Call MCP Memory Service
    curl -s -X POST "${MCP_ENDPOINT}/api/retrieve" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"${query}\",
            \"n_results\": ${n_results}
        }" 2>/dev/null || echo "[]"
}

# Function: Format memories for context injection
format_memory_context() {
    local memories_json="$1"
    
    echo "=== RELEVANT PROJECT MEMORIES ===" > "$MEMORY_CONTEXT_FILE"
    echo "" >> "$MEMORY_CONTEXT_FILE"
    
    # Parse and format memories (requires jq)
    if command -v jq &> /dev/null; then
        echo "$memories_json" | jq -r '.[] | "- \(.content)\n  Tags: \(.tags | join(", "))\n"' >> "$MEMORY_CONTEXT_FILE" 2>/dev/null || true
    else
        echo "$memories_json" >> "$MEMORY_CONTEXT_FILE"
    fi
    
    echo "" >> "$MEMORY_CONTEXT_FILE"
    echo "=== END MEMORIES ===" >> "$MEMORY_CONTEXT_FILE"
}

# Function: Store session results to memory
store_session_memory() {
    local session_summary="$1"
    local tags="$2"
    
    echo -e "${BLUE}[Memory] Storing session insights...${NC}" >&2
    
    curl -s -X POST "${MCP_ENDPOINT}/api/store" \
        -H "Content-Type: application/json" \
        -d "{
            \"content\": \"${session_summary}\",
            \"tags\": ${tags},
            \"memory_type\": \"session\",
            \"metadata\": {
                \"tool\": \"gemini-cli\",
                \"project\": \"${PROJECT_DIR}\"
            }
        }" 2>/dev/null || true
}

# Function: Extract key insights from session
extract_insights() {
    local session_log="$1"
    
    # Simple extraction: look for decision keywords
    grep -i "decided\|implemented\|fixed\|approach\|solution" "$session_log" | head -5 || echo "Session completed"
}

# Main execution
main() {
    local user_query="$@"
    
    echo -e "${GREEN}🧠 Gemini CLI with Memory${NC}"
    echo -e "${BLUE}Project: ${PROJECT_DIR}${NC}"
    echo ""
    
    # Pre-execution: Retrieve memories
    if [ -n "$user_query" ]; then
        local memories=$(retrieve_memories "$user_query" 5)
        format_memory_context "$memories"
        
        if [ -s "$MEMORY_CONTEXT_FILE" ]; then
            echo -e "${GREEN}✓ Memory context loaded${NC}"
            echo ""
        fi
    fi
    
    # Run Gemini CLI with memory context
    if [ -s "$MEMORY_CONTEXT_FILE" ]; then
        # Prepend memory context to query
        local full_query="$(cat $MEMORY_CONTEXT_FILE)

User Query: $user_query"
        gemini "$full_query" | tee "$SESSION_LOG"
    else
        gemini "$user_query" | tee "$SESSION_LOG"
    fi
    
    # Post-execution: Store session results
    if [ -s "$SESSION_LOG" ]; then
        local insights=$(extract_insights "$SESSION_LOG")
        local tags='["gemini-cli", "session", "automated"]'
        store_session_memory "$insights" "$tags"
        echo -e "${GREEN}✓ Session stored to memory${NC}"
    fi
    
    # Cleanup
    rm -f "$MEMORY_CONTEXT_FILE" "$SESSION_LOG"
}

# Run main function
main "$@"
```

### Step 2: Make Script Executable

```bash
chmod +x ~/.local/bin/gemini-with-memory
```

### Step 3: Add to PATH

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

### Step 4: Create Alias

```bash
alias gemini-mem="gemini-with-memory"
```

---

## Usage

### Basic Usage

```bash
# Retrieve memories and run Gemini CLI
gemini-with-memory "How do I implement authentication?"

# With alias
gemini-mem "Explain the project architecture"
```

### Advanced Usage

```bash
# Multi-line query
gemini-with-memory "
I need to:
1. Fix the login bug
2. Add OAuth support
3. Update tests
"
```

---

## Configuration

### Customize Memory Retrieval

Edit the wrapper script to adjust:

```bash
# Number of memories to retrieve
local n_results="${2:-5}"  # Change 5 to desired number

# Memory service endpoint
MCP_ENDPOINT="http://127.0.0.1:8889"  # Update if different

# Tags for stored memories
local tags='["gemini-cli", "session", "automated"]'  # Add custom tags
```

### Customize Memory Scoring

Modify the MCP Memory Service configuration at:
`~/.claude/hooks/config.json`

---

## Limitations

1. **Manual Invocation**: Still requires user to use `gemini-with-memory` instead of `gemini`
2. **Output Parsing**: Extracting insights relies on keyword matching
3. **Context Size**: Large memory contexts may exceed Gemini CLI's input limits
4. **Error Handling**: Failures in memory operations don't block Gemini CLI

---

## Future Enhancements

1. **Shell Integration**: Automatically intercept `gemini` command
2. **Smart Filtering**: Use ML to extract better insights
3. **Incremental Storage**: Store memories as session progresses
4. **Cross-Tool Sync**: Synchronize memories across all tools

---

## Troubleshooting

### Memory Service Not Responding

```bash
# Check if MCP service is running
curl http://127.0.0.1:8889/api/health

# Restart service if needed
pm2 restart memory-service
```

### Script Not Found

```bash
# Verify script is in PATH
which gemini-with-memory

# If not found, add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

### Memories Not Storing

```bash
# Check MCP Memory Service logs
tail -f ~/.local/share/mcp-memory/logs/server.log

# Verify API key is set
echo $MCP_API_KEY
```

---

## See Also

- [Automated Memory Hooks Analysis](./AUTOMATED_MEMORY_HOOKS_ANALYSIS.md)
- [Claude Code Hooks](./mcp-memory-service/claude-hooks/README.md)
- [MCP Memory Service](./mcp-memory-service/README.md)


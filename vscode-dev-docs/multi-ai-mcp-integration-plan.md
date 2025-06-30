# Multi-AI Extension MCP Integration Plan

**Objective**: Enable Cline and other AI coding extensions to use the same Chroma MCP server for shared VANA project context

## Current State Analysis

### What We Have
1. **Chroma MCP Server** running at `/Users/nick/Development/chromadb`
   - Persistent storage with 8+ documents
   - Collection: `vana_memory`
   - Using official `chroma-mcp` via uvx

2. **Claude Code Configuration**
   - `.claude.json` in home directory
   - Project-specific settings in `.claude/settings.local.json`
   - Full MCP integration working

### The Challenge
- Cline and other AI extensions don't use `.claude.json`
- Each extension has its own configuration format
- Need unified access to the same ChromaDB instance

## Integration Architecture

### Option 1: Direct MCP Server Access (Recommended)
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Claude Code │     │    Cline    │     │  Other AI   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                    ┌───────▼───────┐
                    │  Chroma MCP   │
                    │    Server      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  ChromaDB at  │
                    │ /Development/ │
                    │   chromadb     │
                    └───────────────┘
```

### Option 2: HTTP API Wrapper
Create an HTTP API that wraps the MCP server for extensions that don't support MCP protocol.

## Implementation Plan

### Phase 1: Research & Discovery

1. **Investigate Cline's Extension Capabilities**
   - Check if Cline supports MCP protocol
   - Review Cline's API/extension documentation
   - Identify configuration format

2. **Survey Other AI Extensions**
   - Continue (formerly GitHub Copilot Chat)
   - Cursor
   - Amazon CodeWhisperer
   - Any other installed AI coding assistants

### Phase 2: Universal MCP Configuration

#### Step 1: Create Shared MCP Server Configuration
```bash
# Create universal MCP config directory
mkdir -p ~/Development/mcp-shared-config

# Create startup script
cat > ~/Development/mcp-shared-config/start-chroma-mcp.sh << 'EOF'
#!/bin/bash
export CHROMA_CLIENT_TYPE=persistent
export CHROMA_DATA_DIR=/Users/nick/Development/chromadb/db
uvx chroma-mcp
EOF

chmod +x ~/Development/mcp-shared-config/start-chroma-mcp.sh
```

#### Step 2: For Extensions Supporting MCP
Configure each extension to connect to the same MCP server:
```json
{
  "mcp": {
    "servers": {
      "chroma-vana": {
        "command": "~/Development/mcp-shared-config/start-chroma-mcp.sh",
        "type": "stdio"
      }
    }
  }
}
```

### Phase 3: For Extensions Without MCP Support

#### Create HTTP Bridge Server
```python
# ~/Development/mcp-shared-config/chroma-http-bridge.py
from fastapi import FastAPI
import subprocess
import json

app = FastAPI()

@app.post("/search")
async def search(query: str, n_results: int = 5):
    # Call MCP server via subprocess
    result = subprocess.run([
        "uvx", "chroma-mcp", "query",
        "--collection", "vana_memory",
        "--query", query,
        "--n-results", str(n_results)
    ], capture_output=True, text=True)
    return json.loads(result.stdout)

@app.post("/add")
async def add_document(document: str, metadata: dict = None):
    # Implementation for adding documents
    pass
```

### Phase 4: Extension-Specific Configuration

#### For Cline
1. Check for `.cline/config.json` or similar
2. Add ChromaDB configuration:
   ```json
   {
     "memory": {
       "type": "chromadb",
       "endpoint": "http://localhost:8000",
       "collection": "vana_memory"
     }
   }
   ```

#### For Continue
1. Locate Continue's configuration file
2. Add custom context provider if supported

### Phase 5: Shared Memory Protocol

#### Establish Conventions
1. **Collection Naming**: All extensions use `vana_memory`
2. **Metadata Standards**:
   ```json
   {
     "source": "extension_name",
     "timestamp": "ISO8601",
     "type": "code|conversation|decision|insight",
     "project": "vana"
   }
   ```

3. **Query Patterns**:
   - Session start: Query for project context
   - Continuous: Add insights with proper metadata
   - Deduplication: Check before adding similar content

### Phase 6: Testing & Validation

1. **Test Cline Integration**
   - Configure Cline with ChromaDB
   - Verify it can read Claude Code's stored context
   - Test adding new memories from Cline

2. **Cross-Extension Validation**
   - Store context in Claude Code
   - Verify Cline can retrieve it
   - Store context in Cline
   - Verify Claude Code can retrieve it

## Configuration Templates

### For MCP-Compatible Extensions
```json
{
  "mcp_servers": {
    "chroma-vana": {
      "type": "stdio",
      "command": "uvx",
      "args": ["chroma-mcp"],
      "env": {
        "CHROMA_CLIENT_TYPE": "persistent",
        "CHROMA_DATA_DIR": "/Users/nick/Development/chromadb/db"
      }
    }
  }
}
```

### For HTTP API Access
```json
{
  "memory_api": {
    "endpoint": "http://localhost:8000",
    "auth": "optional_api_key",
    "collection": "vana_memory"
  }
}
```

## Benefits

1. **Shared Context**: All AI assistants access the same project knowledge
2. **Consistency**: Unified memory across different coding sessions
3. **Efficiency**: No duplicate storage or conflicting information
4. **Flexibility**: Works with both MCP and non-MCP extensions

## Next Steps

1. Research Cline's actual configuration format
2. Create proof-of-concept integration
3. Document setup instructions for each extension
4. Consider creating a VS Code extension to manage unified MCP configuration
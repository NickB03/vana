# Cline ChromaDB MCP Integration Setup

## Quick Setup Instructions

### 1. Add Chroma MCP to Cline Configuration

Edit the Cline MCP settings file:
```
/Users/nick/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
```

Add this configuration to the `mcpServers` object:

```json
"chroma-vana": {
  "autoApprove": [
    "chroma_query_documents",
    "chroma_get_documents",
    "chroma_get_collection_count",
    "chroma_list_collections"
  ],
  "disabled": false,
  "timeout": 60,
  "type": "stdio",
  "command": "uvx",
  "args": ["chroma-mcp"],
  "env": {
    "CHROMA_CLIENT_TYPE": "persistent",
    "CHROMA_DATA_DIR": "/Users/nick/Development/chromadb/db"
  }
}
```

### 2. Alternative: Using Cline's MCP UI

1. Open VS Code
2. Open Cline extension (Cmd+Shift+P → "Cline: Open Chat")
3. Click the "MCP Servers" icon in Cline's navigation
4. Click "Add Server" or "Configure MCP Servers"
5. Add the Chroma MCP configuration

### 3. Verify Installation

After adding the configuration:
1. Restart VS Code or reload Cline
2. Check Cline's MCP Servers panel - should show green "active" status
3. The following tools should be available:
   - `chroma_query_documents`
   - `chroma_add_documents`
   - `chroma_get_documents`
   - `chroma_get_collection_count`
   - `chroma_list_collections`
   - `chroma_create_collection`
   - `chroma_delete_documents`

### 4. Test the Integration

Ask Cline to:
```
"Search the vana_memory collection for information about ChromaDB migration"
```

Expected behavior:
- Cline should use `chroma_query_documents` tool
- Return results from the shared ChromaDB instance
- Access the same context as Claude Code

## Shared Memory Protocol for Cline

### When Starting a Session
Cline should query for existing context:
```
Tool: chroma_query_documents
Collection: vana_memory
Query: "VANA project current status Cline"
```

### When Storing Information
Use consistent metadata:
```json
{
  "source": "cline",
  "timestamp": "2025-01-30T10:00:00Z",
  "type": "code|conversation|decision|insight",
  "project": "vana",
  "user": "Nick"
}
```

### Auto-Approve Settings
The `autoApprove` array includes safe read operations:
- `chroma_query_documents` - Search
- `chroma_get_documents` - Retrieve
- `chroma_get_collection_count` - Stats
- `chroma_list_collections` - List

Write operations require approval:
- `chroma_add_documents` - Adds new content
- `chroma_delete_documents` - Removes content

## Benefits of Integration

1. **Shared Context**: Cline accesses Claude Code's stored knowledge
2. **Continuity**: Switch between AI assistants without losing context
3. **Collaboration**: Multiple AI tools working with same project memory
4. **Efficiency**: No duplicate information storage

## Troubleshooting

### If Chroma MCP doesn't appear:
1. Ensure `uvx` is installed: `pip install uv`
2. Test manually: `uvx chroma-mcp --help`
3. Check Cline logs for errors

### If connection fails:
1. Verify ChromaDB directory exists: `/Users/nick/Development/chromadb/db`
2. Check if another process is using ChromaDB
3. Review Cline's MCP server logs

### Known Issues:
- `chroma_peek_collection` - numpy serialization error
- `chroma_get_collection_info` - numpy serialization error
- Use `chroma_get_documents` with limit instead

## Next Steps

1. Configure other AI extensions similarly
2. Create shared documentation for all AI tools
3. Consider building a VS Code extension to manage unified MCP configuration
4. Monitor token usage as MCP increases LLM costs
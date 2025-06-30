# Testing Cline ChromaDB Integration

## Quick Test Instructions

### 1. Restart VS Code
Close and reopen VS Code to ensure Cline loads the new MCP configuration.

### 2. Open Cline
- Press `Cmd+Shift+P`
- Type "Cline: Open Chat"
- Or click the Cline icon in the sidebar

### 3. Check MCP Server Status
In Cline's interface, look for:
- MCP Servers panel/icon
- Should show "chroma-vana" as active (green status)

### 4. Test Queries

#### Test 1: Basic Connection
Ask Cline:
```
Can you list the available ChromaDB collections using the chroma MCP tools?
```

Expected: Cline should use `chroma_list_collections` and return ["vana_memory"]

#### Test 2: Query Existing Data
Ask Cline:
```
Search the vana_memory collection for information about "ChromaDB migration" using the chroma MCP tools
```

Expected: Cline should use `chroma_query_documents` and return results about the migration

#### Test 3: Check Document Count
Ask Cline:
```
How many documents are in the vana_memory collection? Use the chroma MCP tools to check.
```

Expected: Cline should use `chroma_get_collection_count` and return the current count (8+)

### 5. Verify Auto-Approve Behavior
- Read operations should execute without prompting
- Write operations (add/delete) should request approval

### 6. Test Cross-Tool Memory

#### Step 1: Add from Cline
Ask Cline:
```
Add a test document to vana_memory collection with the content "Test from Cline at [timestamp]" and metadata source="cline"
```

#### Step 2: Verify in Claude Code
In Claude Code, run:
```
Query vana_memory for "Test from Cline"
```

Should return the document added by Cline.

## Troubleshooting

### If Chroma MCP doesn't appear in Cline:
1. Check if `uvx` is installed: 
   ```bash
   which uvx
   # If not found: pip install uv
   ```

2. Verify ChromaDB path exists:
   ```bash
   ls -la /Users/nick/Development/chromadb/db
   ```

3. Check Cline logs:
   - Open VS Code Output panel
   - Select "Cline" from dropdown
   - Look for MCP initialization errors

### If queries fail:
1. Try manual ChromaDB test:
   ```bash
   uvx chroma-mcp --help
   ```

2. Check if ChromaDB is accessible:
   ```bash
   CHROMA_CLIENT_TYPE=persistent CHROMA_DATA_DIR=/Users/nick/Development/chromadb/db uvx chroma-mcp
   ```

### Known Limitations:
- Avoid `chroma_peek_collection` (numpy error)
- Avoid `chroma_get_collection_info` (numpy error)
- Use `chroma_get_documents` with limit instead

## Success Indicators
✅ Cline shows chroma-vana as active  
✅ Can list collections  
✅ Can query existing documents  
✅ Can add new documents (with approval)  
✅ Changes are visible across AI tools  

## Next Steps
Once verified:
1. Document any Cline-specific behaviors
2. Configure other AI extensions similarly
3. Create shared usage guidelines
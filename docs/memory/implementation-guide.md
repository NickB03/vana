# VANA Memory System Implementation Guide

## Prerequisites

- Python 3.13+ (mandatory for production)
- Claude Code installed and configured
- Access to .claude/ directory
- Basic understanding of MCP (Model Context Protocol)

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
# Core dependencies
pip install chromadb==0.5.0
pip install watchdog==3.0.0
pip install python-dotenv==1.0.0

# Optional for enhanced functionality
pip install numpy
pip install pandas
```

### Step 2: Set Up Directory Structure

```
vana/
├── scripts/
│   ├── local_memory_server.py      # Custom MCP server
│   ├── auto_memory_integration.py  # Auto-indexing system
│   └── vector_db_update_strategy.py # Update logic
├── .claude/
│   ├── status.md                   # Project status
│   ├── blockers.md                 # Current issues
│   ├── settings.local.json         # Permissions
│   └── claude-memory-instructions.md # Memory protocol
└── .memory_db/
    └── chroma.sqlite3              # Vector database
```

### Step 3: Configure MCP Server

Edit `~/.claude.json`:

```json
{
  "projects": {
    "/Users/nick/Development/vana": {
      "memory": {
        "type": "stdio",
        "command": "python",
        "args": [
          "/Users/nick/Development/vana/scripts/local_memory_server.py"
        ],
        "env": {
          "PYTHONUNBUFFERED": "1",
          "VANA_PROJECT_ROOT": "/Users/nick/Development/vana"
        }
      }
    }
  }
}
```

### Step 4: Grant Permissions

Edit `.claude/settings.local.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "WebFetch(domain:google.com)",
      "memory",
      "sequentialthinking"
    ],
    "deny": []
  }
}
```

### Step 5: Initialize Memory Database

```python
# scripts/init_memory.py
import chromadb
from chromadb.config import Settings
import os

# Create database directory
os.makedirs('.memory_db', exist_ok=True)

# Initialize ChromaDB
client = chromadb.PersistentClient(
    path=".memory_db",
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True
    )
)

# Create collection
collection = client.get_or_create_collection(
    name="vana_memory",
    metadata={"project": "VANA", "version": "1.0"}
)

print(f"Memory database initialized with {collection.count()} chunks")
```

### Step 6: Implement Auto-Indexing

Key components of the auto-indexing system:

```python
# Monitor file changes
def watch_directory(path=".claude"):
    event_handler = FileChangeHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()

# Process new/modified files
def index_file(filepath):
    content = read_file_safely(filepath)
    chunks = create_chunks(content)
    embeddings = generate_embeddings(chunks)
    store_in_chromadb(chunks, embeddings, filepath)

# Handle conflicts
def update_with_conflict_resolution(filepath, new_chunks):
    existing = collection.get(where={"source": filepath})
    if existing['ids']:
        collection.delete(ids=existing['ids'])
    collection.add(
        documents=new_chunks,
        metadatas=[{"source": filepath}] * len(new_chunks),
        ids=generate_ids(filepath, new_chunks)
    )
```

### Step 7: Test the System

Run validation tests:

```bash
# Test memory server connection
python scripts/test_memory_connection.py

# Test auto-indexing
python scripts/test_auto_indexing.py

# Test search functionality
python scripts/test_vector_search.py

# Full integration test
python scripts/test_phase1_indexing.py
```

### Step 8: Verify in Claude Code

1. Restart Claude Code
2. Run `/mcp` command
3. Look for "memory" in the server list
4. Test with: `mcp__memory__search_memory` query

## Common Implementation Patterns

### Memory Storage Pattern

```python
async def store_memory(content, metadata):
    try:
        # Generate embedding
        embedding = await generate_embedding(content)
        
        # Store in ChromaDB
        collection.add(
            documents=[content],
            embeddings=[embedding],
            metadatas=[metadata],
            ids=[generate_unique_id()]
        )
        
        return {"success": True, "message": "Memory stored"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Memory Retrieval Pattern

```python
async def search_memory(query, max_results=5):
    try:
        # Search ChromaDB
        results = collection.query(
            query_texts=[query],
            n_results=max_results,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        formatted = format_search_results(results)
        return {"success": True, "results": formatted}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

### Conflict Resolution Pattern

```python
def resolve_conflicts(existing_chunks, new_chunks):
    # Remove duplicates
    unique_new = filter_duplicates(existing_chunks, new_chunks)
    
    # Update modified chunks
    updated = update_modified_chunks(existing_chunks, new_chunks)
    
    # Merge results
    final_chunks = merge_chunks(existing_chunks, unique_new, updated)
    
    return final_chunks
```

## Troubleshooting

### Issue: Memory server not visible in `/mcp`

**Solution:**
1. Check .claude.json configuration
2. Verify permissions in settings.local.json
3. Restart Claude Code
4. Check server logs for errors

### Issue: Search returns no results

**Solution:**
1. Verify database has indexed content
2. Check embedding generation
3. Test with broader queries
4. Review search relevance thresholds

### Issue: Auto-indexing not working

**Solution:**
1. Check file watcher permissions
2. Verify .claude/ directory exists
3. Test with manual file creation
4. Review observer logs

## Performance Optimization

### Chunking Strategy
- Optimal chunk size: 500-1000 characters
- Overlap: 100-200 characters
- Metadata: Include source, timestamp, section

### Embedding Cache
- Cache frequently accessed embeddings
- Use batch processing for multiple files
- Implement TTL for cache entries

### Search Optimization
- Pre-filter by metadata before vector search
- Use relevance threshold (0.7 recommended)
- Implement result re-ranking

## Next Steps

With the implementation complete:
1. Monitor performance metrics
2. Gather user feedback
3. Plan Phase 2 enhancements
4. Consider cloud deployment options
# Memory Tools

Persistent memory operations using ChromaDB and knowledge graph storage.

## Available Tools

### `mcp__memory__search_memory`
**Status**: ✅ Fully Functional  
**Description**: Semantic search across stored memory chunks

```python
# Example usage
result = await mcp__memory__search_memory(
    query="VANA project documentation progress",
    max_results=5
)
# Returns: relevant memory chunks with similarity scores
```

**Parameters**:
- `query` (string, required): Search terms or semantic query
- `max_results` (integer, optional): Maximum results to return (default: 5)

**Response Format**:
```json
{
  "results": [
    {
      "content": "Memory content...",
      "similarity": 0.85,
      "metadata": {"category": "documentation"}
    }
  ]
}
```

### `mcp__memory__store_memory`
**Status**: ✅ Fully Functional  
**Description**: Store new information in persistent memory

```python
# Example usage
result = await mcp__memory__store_memory(
    content="Documentation update completed",
    metadata={"category": "task_completion", "priority": "high"}
)
# Returns: storage confirmation with chunk ID
```

**Parameters**:
- `content` (string, required): Information to store
- `metadata` (object, optional): Additional context and categorization

**Best Practices**:
- Keep content concise to avoid storage failures
- Use descriptive metadata for better retrieval
- Store insights immediately when discovered

### `mcp__memory__memory_stats`
**Status**: ✅ Fully Functional  
**Description**: Database statistics and health information

```python
# Example usage
result = await mcp__memory__memory_stats()
# Returns: database metrics and storage information
```

**Response Includes**:
- Total stored chunks
- Database size and usage
- Index status and performance
- Recent activity metrics

### `mcp__memory__operation_status`
**Status**: ✅ Fully Functional  
**Description**: Real-time operation tracking and progress

```python
# Example usage
result = await mcp__memory__operation_status()
# Returns: current operations and system status
```

**Monitoring Features**:
- Active operations tracking
- Progress indicators
- Error status reporting
- Performance metrics

### `mcp__memory__index_files`
**Status**: ✅ Fully Functional  
**Description**: Index directory contents for searchable memory

```python
# Example usage
result = await mcp__memory__index_files(directory="/path/to/docs")
# Returns: indexing results and file count
```

**Parameters**:
- `directory` (string, optional): Directory to index (default: .claude/)

## Memory System Architecture

### Dual Memory Setup
- **ChromaDB Memory**: Persistent vector-based storage
- **Standard Memory**: Session-based temporary storage
- **Cross-Integration**: Seamless operation between systems

### Storage Categories
- **Technical Decisions**: Architecture choices and patterns
- **User Preferences**: Communication style and workflow preferences
- **Project Status**: Current state, priorities, and blockers
- **System Knowledge**: Deployment, testing, and configuration info

## Implementation Details

**MCP Server**: Custom ChromaDB server at startup  
**Database Path**: `/Users/nick/Development/vana/.memory_db`  
**Vector Engine**: ChromaDB with semantic embeddings  
**Configuration**: Automatic server detection and connection

## Usage Protocol

### Session Start (Mandatory)
```python
# Always begin sessions with memory retrieval
search_result = await mcp__memory__search_memory(
    query="VANA project Nick recent work"
)
```

### Autonomous Storage
- Store insights immediately without prompting
- Capture technical decisions and patterns
- Record user feedback and preferences
- Update project status continuously

### Memory Consolidation
- Use `/memory-consolidate` before `/compact` commands
- Prioritize high-value information storage
- Maintain session continuity through compaction

## Performance Considerations

- **Content Length**: Keep storage content concise
- **Batch Operations**: Minimize individual storage calls
- **Search Optimization**: Use specific, targeted queries
- **Regular Cleanup**: Monitor database growth and performance

## Automatic Cleanup System

### Auto Cleanup Service
**Status**: ✅ Fully Implemented  
**Description**: Automated duplicate cleanup system that runs independently

```bash
# Start automatic cleanup service
./scripts/start_auto_cleanup.sh

# Stop automatic cleanup service  
./scripts/stop_auto_cleanup.sh
```

**Features**:
- **Scheduled Cleanup**: Runs every 6 hours automatically
- **Configurable Threshold**: Triggers cleanup when 10+ duplicates detected
- **Background Daemon**: Runs independently without manual intervention
- **Logging**: Comprehensive activity logs in `auto_cleanup.log`
- **Result Tracking**: Saves cleanup results with timestamps

### Implementation Files
- `scripts/auto_memory_cleanup.py` - Main cleanup service with scheduling
- `scripts/start_auto_cleanup.sh` - Launch daemon service
- `scripts/stop_auto_cleanup.sh` - Graceful service shutdown
- `scripts/cleanup_chromadb_duplicates.py` - Core cleanup logic

### Configuration Options
```python
# Customizable parameters
interval_hours = 6      # Hours between cleanup checks
duplicate_threshold = 10  # Minimum duplicates to trigger cleanup
```

### Service Management
```bash
# Check if service is running
ps aux | grep auto_memory_cleanup

# View service logs
tail -f auto_cleanup.log

# Check PID file
cat scripts/auto_cleanup.pid
```

**Prevention Strategy**: The auto cleanup system prevents duplicate accumulation by:
1. Monitoring ChromaDB for duplicate content patterns
2. Automatically removing duplicates when threshold exceeded
3. Preserving most recent versions based on timestamps
4. Maintaining database performance and search precision
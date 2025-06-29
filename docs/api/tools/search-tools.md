# Search Tools

Pattern matching and content search capabilities across files and directories.

## Available Tools

### `vector_search`
**Status**: ✅ Fully Functional  
**Description**: Semantic vector-based search using embeddings

```python
# Example usage
result = await vector_search("machine learning concepts")
# Returns: relevant content matches with similarity scores
```

**Parameters**:
- `query` (string, required): Search terms or semantic query
- `limit` (number, optional): Maximum results to return
- `threshold` (number, optional): Minimum similarity score

### `web_search`
**Status**: ✅ Fully Functional  
**Description**: Search web content and return structured results

```python
# Example usage
result = await web_search("Python async programming")
# Returns: web search results with URLs and snippets
```

**Parameters**:
- `query` (string, required): Web search query
- `max_results` (number, optional): Maximum results to fetch

### `search_knowledge`
**Status**: ✅ Fully Functional  
**Description**: Search internal knowledge base and documentation

```python
# Example usage
result = await search_knowledge("API endpoints documentation")
# Returns: matching knowledge base entries
```

**Parameters**:
- `query` (string, required): Knowledge search terms
- `category` (string, optional): Specific knowledge category

### `coordinated_search_tool`
**Status**: ❌ Known Issue  
**Description**: Advanced multi-source search coordination

**Known Bug**: Tool initialization error - `FunctionTool.init() got an unexpected keyword argument 'name'`  
**Location**: `lib/_tools/search_coordinator.py:425`  
**Workaround**: Use individual search tools instead

## Implementation Details

**Source Location**: `lib/_tools/adk_tools.py`  
**Search Service**: `lib/_shared_libraries/vector_search_service.py`  
**Coordination Manager**: `lib/_shared_libraries/coordination_manager.py`

## Performance Features

- **Intelligent Caching**: Results cached for faster repeated searches
- **Parallel Execution**: Multiple search sources queried simultaneously
- **Result Ranking**: Relevance scoring and result prioritization

## Common Use Cases

1. **Code Discovery**: Find functions and implementations
2. **Documentation Search**: Locate relevant guides and examples
3. **Knowledge Retrieval**: Access internal knowledge base
4. **Web Research**: Gather external information and references

## Search Optimization Tips

- Use specific terms for better precision
- Combine multiple search tools for comprehensive results
- Leverage semantic search for concept-based queries
- Filter results by relevance thresholds
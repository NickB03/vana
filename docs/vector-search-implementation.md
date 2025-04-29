# Vector Search Implementation for VANA

## Overview

This document provides detailed specifications for implementing the Vector Search component of VANA using Vertex AI. The Vector Search component is critical for semantic knowledge retrieval and forms part of the hybrid search system that combines with the Knowledge Graph.

## Model Selection

For VANA's MVP implementation, we will use Vertex AI's text embedding models:

| Model | Dimensions | Context Window | Best Use Case |
|-------|------------|----------------|--------------|
| `text-embedding-004` | 1408 | 8192 tokens | Primary model - highest quality |
| `textembedding-gecko@latest` | 768 | 3072 tokens | Fallback model |

**Recommendation**: Use `text-embedding-004` as our primary embedding model for its superior quality and larger context window. The `textembedding-gecko` models can serve as fallbacks if needed for cost optimization.

## Document Chunking Strategy

To optimize retrieval quality with Vertex AI models, we'll implement a semantic chunking strategy:

### Chunk Sizing for text-embedding-004

- **Primary chunk size**: 2048-4096 tokens
- **Chunk overlap**: 256-512 tokens (approximately 10-15%)
- **Section awareness**: Respect document structure (headings, sections)

### Chunking Implementation

The chunking process will:

1. Preserve document hierarchy (sections, subsections)
2. Maintain semantic boundaries (paragraphs, lists)
3. Include heading context with each chunk
4. Apply consistent metadata across related chunks

## Metadata Schema

For optimal filtering and retrieval, chunks will include this metadata:

```json
{
  "source": "STRING",           // Document source/URL
  "doc_id": "STRING",           // Unique document identifier
  "section_path": "STRING",     // e.g., "1.2.3" for nested headings
  "heading": "STRING",          // Section heading text
  "doc_type": "STRING",         // Document category
  "created_date": "STRING",     // ISO format date
  "token_count": "INT",         // Token count for the chunk
  "chunk_id": "STRING"          // Unique chunk identifier
}
```

## Vector Index Configuration

The Vertex AI Vector Search index will be configured with:

- **Dimensions**: 1408 (matching text-embedding-004)
- **Distance metric**: DOT_PRODUCT_DISTANCE
- **Approximate neighbor count**: 150
- **Sharding strategy**: SHARD_SIZE_MEDIUM (adjustable based on corpus size)
- **Index update method**: BATCH_UPDATE for efficiency

## Deployment Flow

1. **Document Processing Pipeline**
   - Parse documents with Document AI
   - Apply semantic chunking
   - Generate embeddings with text-embedding-004
   - Store in Vector Search index

2. **Search Implementation**
   - Generate query embeddings
   - Perform vector similarity search
   - Apply metadata filtering as needed
   - Return formatted results with source context

3. **Hybrid Integration**
   - Combine Vector Search results with Knowledge Graph
   - Apply re-ranking based on combined relevance
   - Present unified results to the user

## Integration with ADK

The Vector Search component will be exposed through the ADK agent as:

```python
@tool_lib.tool("vector_search")
def vector_search(self, query: str, top_k: int = 5) -> str:
    """
    Search for information in the knowledge base.

    Args:
        query: The search query
        top_k: Maximum number of results to return (default: 5)

    Returns:
        Formatted string with search results
    """
```

## Performance Considerations

- **Batch updates**: Schedule regular batch updates rather than real-time updates
- **Caching**: Implement response caching for frequent queries
- **Monitoring**: Track latency, recall, and precision metrics
- **Scaling**: Monitor index size and adjust sharding as the corpus grows

## Testing Strategy

1. **Retrieval Quality Testing**
   - Prepare test queries with known correct answers
   - Measure precision@k and recall@k
   - Compare against baseline keyword search

2. **Performance Testing**
   - Measure latency at different query loads
   - Test with incrementally growing corpus sizes
   - Verify throughput under concurrent queries

## Enhanced Hybrid Search

The enhanced hybrid search combines Vector Search, Knowledge Graph, and Web Search to provide the most comprehensive results. It leverages the strengths of each approach:

- **Vector Search**: Provides semantic understanding and similarity-based retrieval
- **Knowledge Graph**: Provides structured knowledge and explicit relationships
- **Web Search**: Provides up-to-date information from the web

### Implementation

The enhanced hybrid search is implemented in `tools/enhanced_hybrid_search.py` and includes:

1. **Query Processing**: Analyzes and processes the query
2. **Parallel Search**: Sends the query to Vector Search, Knowledge Graph, and Web Search
3. **Result Merging**: Combines results from all sources with deduplication
4. **Dynamic Ranking**: Ranks results based on relevance, source quality, and recency
5. **Response Formatting**: Generates a coherent response with source attribution

### Fallback Mechanism

The enhanced hybrid search includes a robust fallback mechanism:

1. **Mock Vector Search**: When the real Vector Search is unavailable (due to permissions or connectivity issues), the system automatically falls back to a mock implementation that provides predefined responses for common queries.

2. **Mock Knowledge Graph**: Similarly, when the Knowledge Graph is unavailable, the system uses a mock implementation to ensure continuity.

3. **Graceful Degradation**: The system prioritizes available sources and continues to function even when some components are unavailable, ensuring users always receive a response.

### Usage

```python
from tools.enhanced_hybrid_search import EnhancedHybridSearch

# Initialize enhanced hybrid search
hybrid_search = EnhancedHybridSearch()

# Perform search with all sources
results = hybrid_search.search("What is VANA?", top_k=5, include_web=True)

# Format results
formatted = hybrid_search.format_results(results)
print(formatted)
```

### Web Search Integration

The web search component uses the Google Custom Search API to retrieve up-to-date information from the web. It is implemented in `tools/web_search.py` and includes:

1. **Query Processing**: Prepares the query for web search
2. **API Request**: Sends the query to the Google Custom Search API
3. **Result Processing**: Extracts relevant information from the API response
4. **Result Formatting**: Formats the results for integration with hybrid search

For testing purposes, a mock implementation is provided in `tools/web_search_mock.py`.

## Future Enhancements

1. **Multi-modal Embeddings**: Extend to handle image and code content
2. **Query Expansion**: Implement automatic query expansion techniques
3. **Personalized Ranking**: Adjust ranking based on user context
4. **Cross-lingual Retrieval**: Implement using multilingual embedding models
5. **Query Understanding**: Improve query analysis for better routing
6. **Multi-hop Reasoning**: Enable following multiple relationship paths for complex queries

# Vector Search Client Implementation

[Home](../index.md) > [Implementation](./index.md) > Vector Search Client

## Overview

The Vector Search Client provides a robust interface for interacting with Google Cloud Vertex AI Vector Search. It enables semantic search capabilities for the VANA system by converting text to vector embeddings and performing similarity searches.

This document details the implementation of the `VectorSearchClient` class, which serves as the primary interface for all Vector Search operations in VANA.

## Features

- **Embedding Generation**: Convert text to vector embeddings using Vertex AI's text-embedding-004 model
- **Semantic Search**: Search for content based on semantic similarity
- **Knowledge Retrieval**: Format search results for knowledge retrieval
- **Content Upload**: Upload content with embeddings to the Vector Search index
- **Batch Operations**: Efficiently upload multiple items in batches
- **Health Monitoring**: Comprehensive health status reporting
- **Graceful Fallback**: Automatic fallback to mock implementation when needed
- **Error Handling**: Robust error handling and recovery mechanisms

## Implementation Details

### Class Structure

The `VectorSearchClient` class is implemented in `tools/vector_search/vector_search_client.py` and provides the following methods:

#### Core Methods

- `__init__`: Initialize the client with configuration options
- `is_available`: Check if Vector Search is available
- `generate_embedding`: Generate embedding for text
- `search`: Search for content using a text query
- `search_vector_store`: Search using an embedding directly
- `search_knowledge`: Search for knowledge with enhanced formatting
- `upload_embedding`: Upload content with embedding
- `batch_upload_embeddings`: Upload multiple items in batches
- `get_health_status`: Get detailed health status information

#### Helper Methods

- `_initialize`: Initialize the client with error handling
- `_generate_embedding_rest_api`: Generate embedding using REST API as fallback
- `_get_auth_token`: Get authentication token for Google Cloud API

### Configuration

The Vector Search client can be configured through constructor parameters or environment variables:

| Parameter | Environment Variable | Description | Default |
|-----------|---------------------|-------------|---------|
| `project_id` | `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | None |
| `location` | `GOOGLE_CLOUD_LOCATION` | Google Cloud location | us-central1 |
| `endpoint_id` | `VECTOR_SEARCH_ENDPOINT_ID` | Vector Search endpoint ID | None |
| `deployed_index_id` | `DEPLOYED_INDEX_ID` | Deployed index ID | vanasharedindex |
| `credentials_path` | `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account key file | None |
| `use_mock` | N/A | Whether to use the mock implementation | False |
| `auto_fallback` | N/A | Whether to automatically fall back to mock | True |

### Embedding Generation

The client uses Vertex AI's text-embedding-004 model to generate embeddings:

1. First attempts to use the Vertex AI SDK
2. Falls back to REST API if SDK fails
3. Explicitly converts all values to float to avoid type errors
4. Validates embedding dimensions (expected: 768)

### Search Implementation

The search process follows these steps:

1. For text queries, generate an embedding first
2. Validate and convert embedding values to float
3. Try to search using the high-level API (index_endpoint.match)
4. Fall back to low-level API (match_client) if high-level API fails
5. Format results consistently with content, score, metadata, and ID

### Error Handling and Fallback

The client implements a robust error handling strategy:

1. Validates all inputs before processing
2. Catches and logs all exceptions
3. Automatically falls back to mock implementation when errors occur (if auto_fallback is enabled)
4. Provides detailed error messages for troubleshooting

### Mock Implementation

For testing and fallback scenarios, the client includes:

1. Integration with a full mock implementation (`MockVectorSearchClient`)
2. A simple built-in mock (`SimpleMockVectorSearchClient`) when the full mock is not available

## Usage Examples

### Basic Usage

```python
from tools.vector_search.vector_search_client import VectorSearchClient

# Initialize with default configuration
client = VectorSearchClient()

# Check if Vector Search is available
if client.is_available():
    # Search for content
    results = client.search("What is VANA?", top_k=5)
    
    # Process results
    for result in results:
        print(f"Content: {result['content']}")
        print(f"Score: {result['score']}")
        print(f"Source: {result.get('metadata', {}).get('source', 'unknown')}")
        print("---")
```

### Custom Configuration

```python
# Initialize with custom configuration
client = VectorSearchClient(
    project_id="your-project-id",
    location="us-central1",
    endpoint_id="your-endpoint-id",
    deployed_index_id="your-deployed-index-id",
    credentials_path="/path/to/credentials.json",
    use_mock=False,
    auto_fallback=True
)
```

### Embedding Generation

```python
# Generate embedding for text
embedding = client.generate_embedding("This is a sample text for embedding generation")

# Use the embedding for search
results = client.search_vector_store(embedding, top_k=5)
```

### Content Upload

```python
# Upload content with metadata
client.upload_embedding(
    content="This is a sample document to be indexed",
    metadata={
        "source": "example.txt",
        "author": "VANA Team",
        "created_date": "2023-05-01"
    }
)

# Batch upload multiple items
items = [
    {
        "content": "First document",
        "metadata": {"source": "doc1.txt"}
    },
    {
        "content": "Second document",
        "metadata": {"source": "doc2.txt"}
    }
]
client.batch_upload_embeddings(items)
```

### Health Monitoring

```python
# Get detailed health status
health = client.get_health_status()

print(f"Status: {health['status']}")
print(f"Message: {health['message']}")

if health['status'] != 'healthy':
    print("Recommendations:")
    for recommendation in health.get('recommendations', []):
        print(f"- {recommendation}")
```

## Related Documentation

- [Vector Search Architecture](../architecture/vector-search.md)
- [Knowledge Graph Integration](../knowledge-graph-integration.md)
- [Hybrid Search Implementation](./hybrid-search.md)

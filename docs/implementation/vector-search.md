# VANA Vector Search Subsystem Implementation

[Home](../../index.md) > [Implementation](./index.md) > Vector Search Subsystem

## Overview

This document provides an overview of the Vector Search subsystem within VANA, which leverages Google Cloud Vertex AI Vector Search. This subsystem is critical for semantic knowledge retrieval and is a core component of VANA's `EnhancedHybridSearch` capabilities. It encompasses model selection for embeddings, document chunking strategies, metadata schema, index configuration, and the overall data flow.

For details on the client used to interact with Vertex AI, see [Vector Search Client Implementation](vector-search-client.md).
For health monitoring aspects, see [Vector Search Health Monitoring System Implementation](vector-search-health-monitoring.md) and [Vector Search Health Checker Implementation](vector-search-health-checker.md).

## Embedding Model Selection

VANA primarily uses Google Vertex AI's text embedding models. As per `memory-bank/techContext.md`:
*   **Primary Model:** `text-embedding-004` (or a similar latest generation model provided by Vertex AI). This model typically has **768 dimensions**.
*   **Fallback/Alternative:** `textembedding-gecko@latest` (or specific versions like `textembedding-gecko@003`) can also be used, also typically providing **768 dimensions**.

**Considerations:**
*   The choice of model impacts embedding quality, dimensionality, context window size, and cost.
*   The `VectorSearchClient` should be configurable or adaptable to use the chosen model specified in VANA's configuration (`config.environment`).
*   The Vector Search index must be configured with dimensions matching the chosen embedding model (e.g., 768).

## Document Chunking Strategy

Effective document chunking is crucial for optimal retrieval quality. VANA's `DocumentProcessor` (using its `SemanticChunker`) aims to implement a robust strategy:

*   **Chunk Sizing:**
    *   Chunk sizes should be appropriate for the context window and typical query length relevant to the chosen embedding model. For models like `text-embedding-004` (with an 8192 token input limit for the model itself, not necessarily the chunk size for retrieval), chunks might range from a few hundred to potentially 1000-2000 tokens, depending on the content طبيعة and retrieval strategy.
    *   The `SemanticChunker` in `tools/document_processing/semantic_chunker.py` handles this.
*   **Chunk Overlap:**
    *   A small overlap (e.g., 10-15% of chunk size, or 50-200 tokens) between consecutive chunks helps preserve context across chunk boundaries.
*   **Semantic Awareness:**
    *   The chunking process should strive to respect document structure (headings, sections, paragraphs) and maintain semantic boundaries where possible.
    *   Including heading context or other structural metadata with each chunk can improve retrieval relevance.
*   **Implementation:** These strategies are implemented within `tools/document_processing/document_processor.py` and `tools/document_processing/semantic_chunker.py`.

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

## Vector Index Configuration (Vertex AI)

The Vertex AI Vector Search index should be configured considering:
- **Dimensions**: **768** (to match models like `text-embedding-004` or `textembedding-gecko`).
- **Distance Metric**: `DOT_PRODUCT_DISTANCE` or `COSINE_DISTANCE` are common for text embeddings. `SQUARED_EUCLIDEAN_DISTANCE` is another option. The choice depends on the embedding model's characteristics and normalization.
- **Approximate Nearest Neighbor (ANN) Algorithm Configuration:**
    - `approximateNeighborsCount`: Number of neighbors to search for (e.g., 10-150, depending on recall needs).
    - `leafNodesToSearchPercent` (for tree-AH algorithm) or similar parameters: Controls the trade-off between search accuracy (recall) and latency.
- **Sharding:** Vertex AI handles sharding automatically based on data size. The number of shards can impact update latency and query capacity.
- **Index Update Method:** `BATCH_UPDATE` is generally preferred for efficiency when adding or updating many embeddings. Streaming updates are available for lower latency individual updates but may have higher costs or different performance characteristics.
- **Filtering (Optional):** If metadata filtering is required (e.g., search within a specific `doc_type` or `source`), the index needs to be created with support for filtering, and datapoints must include `restricts` (for string tags) or `numeric_restricts`.

This configuration is done within the Google Cloud Console or via the `gcloud` CLI / Vertex AI SDK when creating the index and endpoint.

## Data Flow for Ingestion and Search

1.  **Document Processing Pipeline (Ingestion):**
    *   Documents are parsed by `DocumentProcessor` (currently PyPDF2/Pytesseract, planned: Vertex AI Document AI).
    *   Text content is chunked by `SemanticChunker`.
    *   Embeddings for each chunk are generated by `VectorSearchClient` using the configured Vertex AI embedding model.
    *   Chunks (with their embeddings and metadata) are prepared in JSONL format and uploaded to GCS.
    *   `VectorSearchClient` triggers a batch update on the Vertex AI Vector Search index using the GCS URI of the JSONL file.
2.  **Search Implementation (Querying):**
    *   A query text is received (e.g., by `EnhancedHybridSearch` or the Vana Agent).
    *   `VectorSearchClient` generates an embedding for the query text.
    *   `VectorSearchClient` sends this query embedding to the Vertex AI Vector Search endpoint to find nearest neighbors.
    *   Metadata filters can be applied if supported and needed.
    *   Results (neighbor IDs, distances/scores) are returned. These IDs typically correspond to `chunk_id`s.
    *   The system then needs to retrieve the original chunk text and context associated with these IDs (this might involve a separate lookup if not returned directly by Vector Search or if only IDs are stored in the index's metadata).
3.  **Hybrid Search Integration:**
    *   `EnhancedHybridSearch` uses `VectorSearchClient` as one of its sources.
    *   Vector Search results are combined with results from Knowledge Graph and Web Search.
    *   A re-ranking algorithm is applied to the combined set to produce the final unified results.

## Performance and Cost Considerations

- **Batch Updates:** Prefer batch updates for ingesting large volumes of data for cost and efficiency.
- **Query Volume & QPS:** Monitor query volume and ensure the Vertex AI endpoint is scaled appropriately (this is often managed by Vertex AI, but pricing can be QPS-based).
- **Embedding Generation Costs:** Embedding generation incurs costs per character/token. Optimize by embedding only necessary content.
- **Index Storage Costs:** Storage costs depend on the number and dimensionality of embeddings.
- **Monitoring:** Track query latency, recall, and precision. The VANA Monitoring Dashboard and `VectorSearchHealthChecker` assist with this.
- **Scaling:** Vertex AI Vector Search is designed to scale, but understanding its limits and sharding behavior is important for very large corpora.

## Testing Strategy

1.  **Retrieval Quality Testing:**
    *   Use a "golden dataset" of queries with known relevant document chunks.
    *   Measure metrics like Mean Reciprocal Rank (MRR), Precision@k, Recall@k, NDCG.
    *   Compare different chunking strategies or embedding models.
2.  **Performance Testing:**
    *   Measure end-to-end query latency (including embedding generation for the query).
    *   Test with varying query loads and concurrent requests.
    *   Evaluate performance as the index size grows.

## Vector Search Client (`VectorSearchClient`) Summary

The `tools/vector_search/vector_search_client.py` is the VANA component that directly interacts with the Vertex AI SDK. Key aspects include:
*   **Initialization:** Configured with GCP project details, endpoint, and index IDs from `config.environment`.
*   **Core Operations:** Provides Python methods for `generate_embeddings`, `find_neighbors`, and data management operations like `upsert_datapoints` (often via GCS) and `remove_datapoints`.
*   **Error Handling & Resilience:** Implements try-except blocks for SDK calls and should integrate with VANA's circuit breaker patterns.
*   **Logging:** Uses VANA's standard logger for operational and debug information.
*   For full details, see [Vector Search Client Implementation](vector-search-client.md).

## Future Enhancements

1.  **Multi-modal Embeddings:** Extending to support image or other data types if VANA's scope expands.
2.  **Advanced Filtering:** Leveraging more sophisticated filtering capabilities of Vertex AI Vector Search.
3.  **Query Preprocessing:** Implementing techniques like query expansion or rephrasing before embedding generation.
4.  **Dynamic Index Selection:** If multiple Vector Search indexes are used (e.g., for different content types or security levels), logic to select the appropriate index per query.
5.  **Integration with Vertex AI Document AI:** Fully transitioning the document parsing stage to use Vertex AI Document AI for improved text extraction and layout understanding, which would feed better quality content into the embedding and chunking process.

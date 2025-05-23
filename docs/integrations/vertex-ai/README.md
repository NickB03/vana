# Google Cloud Vertex AI Integration

[Home](../../index.md) > [Integrations](../index.md) > Vertex AI Integration

This document details VANA's integration with Google Cloud Vertex AI services. Vertex AI is a key platform providing machine learning tools and services that VANA leverages for core functionalities like semantic search, text embedding, and (planned) advanced document parsing.

## 1. Overview

VANA utilizes several services within Vertex AI:

*   **Vertex AI Vector Search (formerly Matching Engine):**
    *   Used for storing and performing similarity searches on high-dimensional vector embeddings. This is the backbone of VANA's semantic search capabilities.
    *   VANA interacts with Vector Search via the `VectorSearchClient`.
*   **Vertex AI Text Embedding Models:**
    *   Models like `text-embedding-004` or `textembedding-gecko` are used to convert textual content into dense vector representations (embeddings). These embeddings are then stored in Vector Search.
    *   Embedding generation is typically handled by methods within the `VectorSearchClient`.
*   **Vertex AI Document AI (Planned Integration):**
    *   The long-term strategy is to use Document AI for advanced parsing of various document formats, extracting text, layout, entities, and other structured information with high accuracy.
    *   This will enhance the quality of content fed into the embedding and chunking stages of the document processing pipeline.

## 2. Key VANA Components Involved

*   **`VectorSearchClient` (`tools/vector_search/vector_search_client.py`):**
    *   The primary VANA tool for all interactions with Vertex AI Vector Search and Text Embedding models.
    *   Handles API calls for generating embeddings, creating/updating Vector Search indexes (via GCS for batch updates), querying indexes, and removing datapoints.
    *   See [VectorSearchClient Implementation](../../implementation/vector-search-client.md) and [VectorSearchClient Usage Guide](../../guides/vector-search-client-usage.md).
*   **`DocumentProcessor` (`tools/document_processing/document_processor.py`):**
    *   While currently using PyPDF2/Pytesseract, it is planned to be enhanced to use Vertex AI Document AI as its primary parsing engine.
    *   See [Document Processing Strategy](../../document-processing-strategy.md) and [DocumentProcessor Implementation](../../implementation/document-processing.md).
*   **`VectorSearchHealthChecker` (`tools/vector_search/health_checker.py`):**
    *   Uses `VectorSearchClient` to perform diagnostic checks on the Vertex AI Vector Search service.
    *   See [VectorSearchHealthChecker Implementation](../../implementation/vector-search-health-checker.md).

## 3. Configuration Requirements

To integrate with Vertex AI, VANA requires the following configurations, set in the `.env` file and accessed via `config.environment`:

*   **`GOOGLE_CLOUD_PROJECT`:** Your GCP Project ID where Vertex AI services are provisioned.
*   **`GOOGLE_CLOUD_LOCATION`:** The GCP region for your Vertex AI resources (e.g., `us-central1`).
*   **`GOOGLE_APPLICATION_CREDENTIALS`:** The absolute path to your GCP Service Account JSON key file. This service account must have appropriate IAM permissions for Vertex AI (e.g., "Vertex AI User" role) and potentially Google Cloud Storage (for index updates).
*   **`VECTOR_SEARCH_ENDPOINT_ID`:** The full resource name of your deployed Vertex AI Vector Search Endpoint.
*   **`DEPLOYED_INDEX_ID`:** The ID of the specific index deployed on the endpoint that VANA will query.
*   **`VERTEX_EMBEDDING_MODEL_ID` (Conceptual/Optional):** The specific ID or name of the text embedding model to be used (e.g., `text-embedding-004`). This might be hardcoded in `VectorSearchClient` or made configurable.
*   **Vertex AI Document AI Processor ID (Future):** When Document AI is integrated, the ID of the specific Document AI processor will also be needed.

## 4. Authentication and Authorization

*   All interactions with Vertex AI services are authenticated using the GCP Service Account specified by `GOOGLE_APPLICATION_CREDENTIALS`.
*   This service account must be granted the necessary IAM roles in your GCP project (e.g., "Vertex AI User," "Storage Object Admin" if using GCS for index data, "Document AI User" for Document AI).

## 5. Data Flow Examples

### 5.1. Embedding Generation and Indexing
1.  Text (e.g., a document chunk from `DocumentProcessor`) is passed to `VectorSearchClient.generate_embeddings()`.
2.  `VectorSearchClient` calls the Vertex AI Prediction Service with the specified embedding model to get the vector embedding.
3.  The embedding, along with an ID and metadata, is prepared (often as a JSONL file).
4.  This data is typically uploaded to a GCS bucket.
5.  `VectorSearchClient` then calls the Vertex AI Index Service to update the Vector Search index with the data from GCS.

### 5.2. Semantic Search
1.  A query text is provided to `VectorSearchClient.generate_embeddings()` to get its vector embedding.
2.  This query embedding is passed to `VectorSearchClient.find_neighbors()`.
3.  `VectorSearchClient` calls the Vertex AI Match Service (or Index Endpoint) with the query embedding, `DEPLOYED_INDEX_ID`, and other search parameters (e.g., `num_neighbors`).
4.  Vertex AI Vector Search performs the similarity search and returns the nearest neighbor datapoint IDs and their distances.
5.  `VectorSearchClient` processes and returns these results.

### 5.3. Document Parsing with Document AI (Planned)
1.  A raw document (file path or bytes) and its MIME type are provided to the (future enhanced) `DocumentProcessor`.
2.  `DocumentProcessor` calls the Vertex AI Document AI service with the specified Document AI processor ID.
3.  Document AI processes the document and returns a structured `Document` object containing extracted text, layout information, entities, tables, etc.
4.  `DocumentProcessor` then uses this structured output for subsequent chunking and embedding.

## 6. Monitoring and Health Checks

*   The VANA Monitoring Dashboard, powered by `VectorSearchHealthChecker` and the Flask API, provides visibility into the health and performance of the Vertex AI Vector Search integration.
*   Key metrics include connectivity, query latency, and status of the index/endpoint.
*   Refer to [Interpreting Vector Search Health Reports Guide](../../guides/vector-search-health-reports.md).

## 7. Cost Considerations

*   Using Vertex AI services (Vector Search, Embedding Models, Document AI) incurs costs on GCP.
*   Costs are typically based on:
    *   Amount of data processed by embedding models.
    *   Storage for Vector Search indexes.
    *   Query volume (QPS) for Vector Search.
    *   Number of pages/documents processed by Document AI.
    *   Network egress.
*   It's essential to monitor GCP billing and set up budgets/alerts.

This deep integration with Vertex AI provides VANA with powerful, scalable machine learning capabilities for its core functions.

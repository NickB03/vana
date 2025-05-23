# Vector Search Client Implementation

[Home](../index.md) > [Implementation](./index.md) > Vector Search Client

## Overview

The `VectorSearchClient` (`tools/vector_search/vector_search_client.py`) provides VANA's primary interface for interacting with Google Cloud Vertex AI Vector Search. Its main responsibilities include generating text embeddings and performing similarity searches against a configured Vector Search index.

This document details the implementation of the `VectorSearchClient` class.

## Features

- **Embedding Generation**: Converts text into vector embeddings using a configured Vertex AI embedding model (e.g., `text-embedding-004`).
- **Semantic Search (`find_neighbors`):** Performs similarity searches against the Vector Search index using query embeddings.
- **Data Upsertion (Conceptual):** Provides methods or supports workflows for uploading data points (ID + embedding) to the Vector Search index. This often involves preparing data in JSONL format and using GCS.
- **Data Removal (Conceptual):** Supports removing data points from the index.
- **Configuration-Driven:** Initializes and operates based on settings from `config/environment.py` (loaded from `.env`).
- **Error Handling:** Implements error handling for Vertex AI SDK calls.
- **Resilience (Integration):** Designed to be used with resilience patterns like Circuit Breakers for its calls to Vertex AI.

Note: While the client itself might report on the success/failure of its operations, comprehensive "Health Monitoring" of the Vector Search service is primarily the responsibility of the `VectorSearchHealthChecker` tool, which *uses* this client.

## Implementation Details

### Class Structure (`VectorSearchClient`)

The `VectorSearchClient` class is implemented in `tools/vector_search/vector_search_client.py`.

#### Core Methods (Conceptual - actual names may vary)

- `__init__(self, mock=False, **kwargs)`:
    - Initializes the Google Cloud AI Platform client (`aiplatform.gapic.MatchServiceClient`, `aiplatform.gapic.PredictionServiceClient` or similar).
    - Loads necessary configuration (project ID, location, endpoint ID, deployed index ID, embedding model ID) from `config.environment`.
    - Sets up authentication using `GOOGLE_APPLICATION_CREDENTIALS`.
    - Optionally initializes in a `mock` mode for testing.
- `generate_embeddings(self, texts: list[str], batch_size: int = None) -> dict`:
    - Takes a list of texts and returns their vector embeddings.
    - Uses a Vertex AI text embedding model.
    - May handle batching of requests to the embedding model.
    - Returns a structure (often a list of predictions from the SDK) containing the embeddings.
- `find_neighbors(self, query_embedding: list[float], num_neighbors: int, filter_conditions: dict = None) -> dict`:
    - Takes a query embedding and the number of neighbors to find.
    - Optionally accepts filter conditions if the index supports filtering.
    - Calls the `match` or `find_neighbors` method of the Vertex AI Vector Search endpoint.
    - Returns the search results, typically including datapoint IDs and distances.
- `upsert_datapoints(self, datapoints: list[dict] = None, gcs_uri: str = None)`: (Conceptual name)
    - Handles adding or updating datapoints in the index.
    - Vertex AI typically requires data to be in JSONL format on Google Cloud Storage (GCS). This method might:
        - Accept a list of datapoint dictionaries (`{"id": "...", "embedding": [...]}`), prepare the JSONL file, upload it to a temporary GCS location, and then call the index update/upsert operation.
        - Or, directly accept a `gcs_uri` pointing to a pre-existing JSONL file.
    - Returns an operation object or status.
- `remove_datapoints(self, datapoint_ids: list[str])`: (Conceptual name)
    - Removes specified datapoints from the index.
    - Returns an operation object or status.

#### Helper Methods (Conceptual)

- `_initialize_vertex_clients()`: Sets up the necessary Vertex AI SDK clients.
- `_get_auth_token()`: Potentially, if direct REST API calls are made as a fallback (though SDK usage is primary).
- Methods for formatting data for Vertex AI or parsing responses.

### Configuration

The `VectorSearchClient` is configured via `config/environment.py`, which loads variables from the `.env` file:

| Environment Variable                 | Description                                  | Example Value                                  |
|--------------------------------------|----------------------------------------------|------------------------------------------------|
| `GOOGLE_CLOUD_PROJECT`               | Google Cloud project ID                      | `your-gcp-project-id`                          |
| `GOOGLE_CLOUD_LOCATION`              | Google Cloud location/region                 | `us-central1`                                  |
| `GOOGLE_APPLICATION_CREDENTIALS`     | Path to GCP service account key file         | `/path/to/your/credentials.json`               |
| `VECTOR_SEARCH_ENDPOINT_ID`          | Full resource name of Vector Search Endpoint | `projects/.../endpoints/your_endpoint_id`      |
| `DEPLOYED_INDEX_ID`                | ID of the deployed index on the endpoint     | `your_deployed_index_id`                       |
| `VERTEX_EMBEDDING_MODEL_ID` (Conceptual) | ID of the text embedding model to use      | `text-embedding-004` or full model name        |

### Embedding Generation (`generate_embeddings`)
*   Uses the Vertex AI Prediction Service client.
*   Takes a list of text strings.
*   Constructs requests for the specified embedding model (e.g., `text-embedding-004`).
*   Handles batching if the input list is large and the model API has batch size limits.
*   Extracts and returns the embedding vectors from the API response.
*   Ensures embeddings are lists of floats and validates dimensions if possible (e.g., 768 for `text-embedding-004`).

### Semantic Search (`find_neighbors`)
*   Uses the Vertex AI Match Service client (or `IndexEndpoint` resource).
*   Takes a query embedding (list of floats) and `num_neighbors`.
*   Constructs a `FindNeighborsRequest` (or equivalent).
*   Sends the request to the configured `VECTOR_SEARCH_ENDPOINT_ID` and `DEPLOYED_INDEX_ID`.
*   Parses the `FindNeighborsResponse` to extract neighbor datapoint IDs and their distances/scores.
*   May convert distances to similarity scores (e.g., `1.0 - distance`).

### Data Management (`upsert_datapoints`, `remove_datapoints`)
*   **Upsertion:**
    *   Vertex AI Vector Search typically requires data for upsertion to be in a JSONL format on Google Cloud Storage (GCS). Each line is a JSON object: `{"id": "your_id", "embedding": [0.1, 0.2, ...], "restricts": [...], "numeric_restricts": [...]}`.
    *   The `upsert_datapoints` method in `VectorSearchClient` would likely:
        1.  Accept datapoints either as a list of Python dicts or a path to a local JSONL file.
        2.  If given dicts, format them into JSONL.
        3.  Upload the JSONL file to a temporary GCS bucket/path (using `google-cloud-storage` client).
        4.  Call the `IndexService.UpdateIndex` or `Index.UpsertDatapoints` method with the GCS URI of the uploaded file.
        5.  Return the long-running operation object from the SDK.
*   **Removal:**
    *   Vertex AI allows removing datapoints by their IDs.
    *   The `remove_datapoints` method would take a list of datapoint IDs and call the appropriate SDK method (e.g., `Index.RemoveDatapoints`).

### Error Handling and Resilience
*   Wraps Vertex AI SDK calls in `try...except` blocks to catch potential exceptions (e.g., `google.api_core.exceptions.GoogleAPIError`).
*   Logs errors using VANA's standard logger.
*   Calls to Vertex AI should be made resilient by wrapping them with a Circuit Breaker instance (see [Resilience Patterns Implementation](resilience-patterns.md)). This is typically done by the `VectorSearchClient` itself or by a higher-level component that uses it.

### Mock Implementation (for testing)
*   The `__init__` method may accept a `mock=True` flag.
*   If `mock=True`, instead of initializing real Vertex AI clients, it could use a mock object (e.g., `unittest.mock.MagicMock` or a custom mock class) that simulates Vertex AI responses.
*   This allows testing of components that depend on `VectorSearchClient` without actual GCP calls, making tests faster and more isolated.

## Testing

The `VectorSearchClient` can be tested using the fixtures provided in `tests/fixtures/vector_search_fixtures.py`:

### Test Fixtures

*   **`mock_vector_search_client`**: A configurable mock client for testing with simulated success and error conditions.
    ```python
    def test_with_mock_client(mock_vector_search_client):
        # Configure the mock client
        mock_vector_search_client.search_success = True

        # Use the mock client in your test
        results = mock_vector_search_client.search("test query")

        # Assert on the results
        assert len(results) > 0
    ```

*   **`patched_vector_search_client`**: Patches the `VectorSearchClient` class to use the mock client.
    ```python
    def test_with_patched_client(patched_vector_search_client):
        # The mock client is already configured and patched
        # Any code that creates a VectorSearchClient will get the mock

        # Configure the mock for this test
        patched_vector_search_client.search_success = True

        # Call code that uses VectorSearchClient
        from tools.vector_search.vector_search_client import VectorSearchClient
        client = VectorSearchClient()  # This will return the mock
        results = client.search("test query")

        # Assert on the results
        assert len(results) > 0
    ```

*   **`real_vector_search_client`**: A real client configured for test environments.
    ```python
    def test_with_real_client(real_vector_search_client):
        # Use the real client in your test
        results = real_vector_search_client.search("test query")

        # Assert on the results
        assert len(results) > 0
    ```

### Integration Testing

Integration tests for the `VectorSearchClient` should verify:

1. **Embedding Generation**: The client correctly generates embeddings from text.
2. **Search Functionality**: The client correctly searches the vector store with embeddings.
3. **Error Handling**: The client gracefully handles errors and falls back to mock implementation when configured.
4. **Authentication**: The client correctly authenticates with Vertex AI.

### Performance Testing

Performance tests for the `VectorSearchClient` should evaluate:

1. **Embedding Generation Latency**: The time taken to generate embeddings.
2. **Search Latency**: The time taken to search the vector store.
3. **Batch Processing Efficiency**: The efficiency of batch operations.
4. **Resource Usage**: Memory and CPU usage during operations.

## Usage Examples

Refer to the [VectorSearchClient Usage Guide](../guides/vector-search-client-usage.md) for detailed examples on:
*   Initializing the client.
*   Generating embeddings.
*   Performing semantic searches.
*   Conceptual examples for uploading and removing data.

## Key Dependencies
*   `google-cloud-aiplatform`: The primary Python SDK for interacting with Vertex AI.
*   `google-cloud-storage` (optional, but likely needed for data upsertion): For interacting with GCS.
*   `python-dotenv`: For loading environment variables.
*   VANA's internal `config.environment` and `tools.logging.logger`.

## Related Documentation
- [VectorSearchClient Usage Guide](../guides/vector-search-client-usage.md)
- [Vector Search Health Monitoring Implementation](vector-search-health-monitoring.md) (uses this client)
- [Enhanced Hybrid Search Implementation](enhanced-hybrid-search.md) (uses this client)
- [Resilience Patterns Implementation](resilience-patterns.md) (patterns applicable to this client)

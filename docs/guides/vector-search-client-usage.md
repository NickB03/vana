# VectorSearchClient Usage Guide

[Home](../../index.md) > [Guides](../index.md) > VectorSearchClient Usage

This guide explains how to use the `VectorSearchClient` (`tools/vector_search/vector_search_client.py`) for interacting with Google Vertex AI Vector Search. This client is a core component for managing embeddings, performing semantic searches, and other related operations.

## 1. Prerequisites

*   **VANA Installation:** Complete VANA project setup as per the [Installation Guide](installation-guide.md).
*   **Configuration:** Ensure your `.env` file is correctly configured with:
    *   `GOOGLE_CLOUD_PROJECT`
    *   `GOOGLE_APPLICATION_CREDENTIALS` (path to your service account key)
    *   `GOOGLE_CLOUD_LOCATION`
    *   `VECTOR_SEARCH_ENDPOINT_ID` (full resource name of your Vector Search Endpoint)
    *   `DEPLOYED_INDEX_ID` (ID of your deployed index)
*   **Vertex AI Setup:** Your Vertex AI Vector Search endpoint and index must be created and deployed in your GCP project.
*   **Virtual Environment:** Activate your Python virtual environment.

## 2. Importing and Initializing the Client

To use the `VectorSearchClient`, you first need to import and initialize it in your Python script or interactive session.

```python
from tools.vector_search.vector_search_client import VectorSearchClient
from config import environment  # To ensure .env is loaded

# Initialize the client
# It automatically picks up configuration from environment variables
try:
    vs_client = VectorSearchClient()
    print("VectorSearchClient initialized successfully.")
except Exception as e:
    print(f"Error initializing VectorSearchClient: {e}")
    # Handle initialization error appropriately
    vs_client = None
```

The client constructor (`__init__`) handles the setup of the Vertex AI `AIPlatformClient`.

## 3. Core Functionalities

The `VectorSearchClient` provides methods for various operations. Below are examples of common use cases. (Note: Method names and parameters might vary slightly based on the exact implementation in `vector_search_client.py`. Always refer to the source code or its docstrings for the most accurate details.)

### 3.1. Generating Embeddings

If the client includes a utility for generating embeddings (often it might, or it might expect embeddings to be pre-generated):

```python
if vs_client:
    texts_to_embed = ["This is a sample document.", "Another piece of text for VANA."]
    try:
        embeddings_response = vs_client.generate_embeddings(texts=texts_to_embed)
        # The structure of embeddings_response depends on the Vertex AI SDK
        # Typically, it's a list of embedding vectors (lists of floats)
        for i, text_embedding in enumerate(embeddings_response.predictions):
             # Access the embedding vector, structure might vary
            embedding_vector = text_embedding.get('embedding', []) # Example access
            print(f"Embedding for text {i+1} (first 5 dims): {embedding_vector[:5]}")
    except Exception as e:
        print(f"Error generating embeddings: {e}")
```
*Note: The exact method for embedding generation and accessing the results depends on the specific Vertex AI embedding model and SDK version used. The `generate_embeddings` method might be a wrapper around the SDK call.*

### 3.2. Searching for Similar Embeddings (Semantic Search)

This is the primary use case for querying the Vector Search index.

```python
if vs_client:
    # Assume you have a query text and have generated its embedding
    query_text = "What are VANA's core features?"
    try:
        # 1. Generate embedding for the query text
        query_embedding_response = vs_client.generate_embeddings(texts=[query_text])
        # Ensure the response structure is handled correctly to extract the embedding vector
        query_embedding_vector = query_embedding_response.predictions[0].get('embedding', [])


        if query_embedding_vector:
            # 2. Perform the search using the query embedding
            # num_neighbors is the number of similar items to retrieve
            search_results = vs_client.find_neighbors(
                query_embedding=query_embedding_vector,
                num_neighbors=5,
                # Optional: filter_conditions (if your index supports filtering)
                # filter_conditions={"namespace": "public", "category": "tech"}
            )

            print(f"\nSearch results for '{query_text}':")
            if search_results and search_results.get('nearestNeighbors'):
                for neighbor_list in search_results['nearestNeighbors']: # Response structure may vary
                    for neighbor in neighbor_list.get('neighbors', []):
                        # 'neighbor' object contains 'datapoint' (with id, embedding) and 'distance'
                        print(f"  ID: {neighbor.get('datapoint', {}).get('datapointId')}, Distance: {neighbor.get('distance')}")
            else:
                print("  No results found or error in search.")
        else:
            print("Could not generate query embedding.")

    except Exception as e:
        print(f"Error during search: {e}")
```

### 3.3. Uploading Data (Embeddings) to the Index

To populate your Vector Search index, you need to upload data points, each consisting of an ID and its embedding vector.

```python
if vs_client:
    # Example data points: list of dictionaries
    # Each dict should have 'id' and 'embedding' (a list of floats)
    # Ensure the embedding dimension matches your index configuration.

    # Assume embeddings_to_upload is a list like:
    # [
    #   {"id": "doc1_chunk1", "embedding": [0.1, 0.2, ..., 0.9]},
    #   {"id": "doc1_chunk2", "embedding": [0.3, 0.1, ..., 0.7]},
    # ]

    # Example: Create some dummy embeddings for demonstration
    # Replace with your actual embedding generation logic
    dummy_embeddings = []
    try:
        embedding_dim = len(vs_client.generate_embeddings(texts=["test"]).predictions[0].get('embedding', [])) # Get embedding dimension
        if embedding_dim > 0:
            dummy_embeddings = [
                {"id": "sample_id_1", "embedding": [0.1] * embedding_dim},
                {"id": "sample_id_2", "embedding": [0.2] * embedding_dim},
            ]
        else:
            print("Could not determine embedding dimension.")

    except Exception as e:
        print(f"Error preparing dummy embeddings: {e}")


    if dummy_embeddings:
        try:
            # The method might be called upsert_datapoints, add_datapoints, or similar
            # It might take a file path (JSONL) or a list of datapoint objects
            # For this example, let's assume it takes a list of datapoint objects
            # This is a conceptual example; the actual method might require data in a JSONL file format
            # and use a method like `upsert_datapoints_from_file` or similar.

            # Refer to Vertex AI SDK documentation for exact `upsert_datapoints` or equivalent method.
            # The client might abstract this to something like:
            # vs_client.upload_embeddings(datapoints=dummy_embeddings)

            # For now, let's simulate this conceptually.
            # A typical Vertex AI workflow involves writing embeddings to a JSONL file in GCS
            # and then calling an update/upsert operation on the index.
            # The VectorSearchClient might abstract parts of this.

            print(f"\nAttempting to upload {len(dummy_embeddings)} embeddings (conceptual):")
            # This is a placeholder for the actual upload logic which is complex
            # and usually involves GCS. The client might have a high-level wrapper.
            # e.g., vs_client.upsert_datapoints(datapoints=dummy_embeddings)

            # If the client expects a file:
            # 1. Create a JSONL file with the embeddings.
            #    Each line: {"id": "...", "embedding": [...]}
            # 2. Upload this file to GCS.
            # 3. Call an index update method with the GCS URI.
            # Example (conceptual, actual method name may differ):
            # operation_result = vs_client.upsert_datapoints_from_gcs_uri(gcs_uri="gs://your-bucket/path/to/embeddings.jsonl")
            # print(f"  Upload operation started: {operation_result}")

            print("  Upload functionality depends on the specific implementation of VectorSearchClient.")
            print("  Typically involves preparing a JSONL file, uploading to GCS, and then updating the index.")
            print("  Please refer to `tools/vector_search/vector_search_client.py` for actual methods.")

        except Exception as e:
            print(f"  Error during conceptual upload: {e}")
```
*Important: Uploading data to Vertex AI Vector Search often involves preparing data in a specific JSONL format, uploading it to Google Cloud Storage (GCS), and then triggering an index update operation. The `VectorSearchClient` might abstract some of these steps. Check its specific methods like `upsert_datapoints`, `add_datapoints`, or methods involving GCS URIs.*

### 3.4. Removing Data from the Index

Removing data points from an index.

```python
if vs_client:
    datapoint_ids_to_remove = ["sample_id_1"] # IDs of datapoints to remove
    try:
        # The method might be called remove_datapoints or similar
        # operation_result = vs_client.remove_datapoints(datapoint_ids=datapoint_ids_to_remove)
        # print(f"\nRemove operation for IDs {datapoint_ids_to_remove} started: {operation_result}")

        print(f"\nAttempting to remove datapoints (conceptual): {datapoint_ids_to_remove}")
        print("  Removal functionality depends on the specific implementation of VectorSearchClient.")
        print("  Please refer to `tools/vector_search/vector_search_client.py` for actual methods.")

    except Exception as e:
        print(f"  Error during conceptual removal: {e}")
```

### 3.5. Getting Index Information

The client might provide methods to get metadata about the index or endpoint.

```python
if vs_client:
    try:
        # Example: Get endpoint details
        # endpoint_info = vs_client.get_endpoint_info()
        # print(f"\nEndpoint Info: {endpoint_info}")

        # Example: Get index details
        # index_info = vs_client.get_index_info()
        # print(f"Index Info: {index_info}")

        print("\nGetting index/endpoint info (conceptual):")
        print("  Functionality depends on the specific implementation of VectorSearchClient.")
        print("  Please refer to `tools/vector_search/vector_search_client.py` for actual methods.")

    except Exception as e:
        print(f"  Error getting info: {e}")
```

## 4. Error Handling and Resilience

### 4.1. Built-in Fallback Mechanisms

The `VectorSearchClient` implements robust error handling for API calls to Vertex AI, including automatic fallback to a mock implementation when configured. This provides graceful degradation when the real Vector Search service is unavailable.

```python
# Create a client with auto_fallback enabled
client = VectorSearchClient(
    use_mock=False,  # Try to use the real service
    auto_fallback=True,  # Fall back to mock if real service fails
    project_id="your-project-id",
    location="us-central1",
    endpoint_id="your-endpoint-id"
)

# Use the client - it will automatically fall back to mock if needed
try:
    results = client.search("test query")
    print(f"Found {len(results)} results")
except Exception as e:
    print(f"Search failed even with fallback: {e}")
```

The client will attempt to use the real Vector Search service first, but will automatically fall back to a mock implementation in the following scenarios:
- Missing or invalid configuration (project ID, credentials, etc.)
- Authentication failures
- Network errors
- API errors from Vertex AI
- Invalid input parameters

You can check if the client is using the mock implementation:

```python
if client.using_mock:
    print("Warning: Using mock implementation - results may not be accurate")
```

### 4.2. Circuit Breaker Integration

For more advanced resilience, you can integrate the `VectorSearchClient` with a circuit breaker from `tools/monitoring/circuit_breaker.py`:

```python
from tools.monitoring.circuit_breaker import CircuitBreaker, CircuitOpenError

# Create a client
client = VectorSearchClient(auto_fallback=True)

# Create a circuit breaker
circuit_breaker = CircuitBreaker(
    failure_threshold=3,
    recovery_timeout=60,
    name="vector-search-circuit"
)

# Use the circuit breaker to protect calls to the client
def search_with_protection(query):
    try:
        return circuit_breaker.call(client.search, query)
    except CircuitOpenError:
        print("Circuit is open - Vector Search is temporarily unavailable")
        return []  # Return empty results or cached data
    except Exception as e:
        print(f"Search error: {e}")
        return []

# Use the protected function
results = search_with_protection("test query")
```

The circuit breaker will:
1. Allow calls to pass through when the service is healthy
2. Track failures and open the circuit after reaching the threshold
3. Reject calls when the circuit is open, preventing cascading failures
4. Attempt recovery after the timeout period

### 4.3. General Error Handling

Always wrap calls to the client in `try...except` blocks in your own code to handle potential exceptions gracefully:

```python
try:
    results = client.search("test query")
    # Process results
except Exception as e:
    logger.error(f"Vector Search error: {e}")
    # Handle error appropriately
    results = []  # Provide fallback or default response
```

Common error scenarios to handle:
- Network issues
- Authentication problems
- API errors
- Invalid input parameters
- Circuit breaker open exceptions

## 5. Mock Client for Testing

The `VectorSearchClient` might have a mock mode or a separate mock implementation for testing purposes. This allows testing of dependent components without making actual calls to GCP.

```python
# Example of how a mock client might be set (if supported by the client's constructor)
# try:
#     mock_vs_client = VectorSearchClient(mock=True)
#     print("\nMock VectorSearchClient initialized.")
#     # Now calls to mock_vs_client will use predefined mock behavior
# except Exception as e:
#     print(f"Error initializing mock client: {e}")
```
Check the client's `__init__` method or documentation for details on enabling mock mode.

## 6. Best Practices

*   **Batching:** For operations like uploading embeddings or generating embeddings for many texts, use batching methods if provided by the client or SDK to improve efficiency and reduce API calls.
*   **Asynchronous Operations:** Some Vertex AI operations (like index updates) are long-running. The client should handle these appropriately, possibly by returning an operation object that can be polled for status.
*   **Cost Management:** Be mindful of the costs associated with Vertex AI Vector Search (e.g., storage, QPS for queries, index updates). Optimize your usage patterns.
*   **IAM Permissions:** Ensure the service account used by `VectorSearchClient` has the minimum necessary IAM permissions for Vertex AI.

This guide provides a general overview of how to use the `VectorSearchClient`. For specific method signatures, parameters, and return values, always consult the source code of `tools/vector_search/vector_search_client.py` and the official Google Cloud Vertex AI SDK documentation.

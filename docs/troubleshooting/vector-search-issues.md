# Troubleshooting Vector Search Issues

[Home](../index.md) > [Troubleshooting](index.md) > Vector Search Issues

This guide provides solutions for common issues encountered with the Vertex AI Vector Search integration in VANA. For general troubleshooting, see [Common Issues](common-issues.md).

## 1. Connection & Authentication Issues

### Symptoms:
-   Error messages like "Failed to find Vector Search endpoint," "Could not connect," "Permission Denied," or "403 Forbidden."
-   `VectorSearchClient` or `VectorSearchHealthChecker` fails to initialize or make calls to Vertex AI.

### Possible Causes:
1.  **Incorrect Environment Variables:** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VECTOR_SEARCH_ENDPOINT_ID`, `DEPLOYED_INDEX_ID` in `.env` might be wrong or missing.
2.  **Invalid/Missing GCP Service Account Credentials:** `GOOGLE_APPLICATION_CREDENTIALS` path in `.env` is incorrect, file is missing/unreadable, or key is invalid.
3.  **Insufficient IAM Permissions:** The service account lacks necessary roles (e.g., "Vertex AI User") for the specified GCP project.
4.  **Vertex AI API Not Enabled:** The "Vertex AI API" might not be enabled for the GCP project.
5.  **Network Connectivity:** Issues preventing VANA from reaching `https://aiplatform.googleapis.com`.
6.  **Endpoint/Index Misconfiguration:** The specified Vector Search endpoint or deployed index does not exist, is in a different region, or is not correctly deployed.

### Solutions:
1.  **Verify Environment Variables:**
    *   Carefully check all Vector Search related variables in your `.env` file against your GCP project settings.
    *   Ensure `VECTOR_SEARCH_ENDPOINT_ID` is the full resource name.
2.  **Check Service Account & Permissions:**
    *   Verify the path to the service account key file in `GOOGLE_APPLICATION_CREDENTIALS`.
    *   Ensure the service account has at least the "Vertex AI User" role for your project in the GCP IAM console.
    *   Test authentication locally using `gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS`.
3.  **Enable Vertex AI API:** In GCP Console, navigate to "APIs & Services" > "Library" and ensure "Vertex AI API" is enabled.
4.  **Verify Endpoint and Index:**
    *   Use `gcloud ai index-endpoints list --project=<your-project> --region=<your-region>` to list available endpoints.
    *   Use `gcloud ai indexes list --project=<your-project> --region=<your-region>` to list available indexes.
    *   Ensure the `DEPLOYED_INDEX_ID` on your endpoint matches your configuration.
5.  **Network Test:** `curl -I https://aiplatform.googleapis.com` from the machine running VANA.
6.  **Use Health Checker:** Run `python scripts/test_vector_search_health.py --mode detailed` for diagnostic information. Check the [Interpreting Health Reports Guide](../guides/vector-search-health-reports.md).

## 2. Embedding Generation Issues

### Symptoms:
-   Errors like "Error generating embedding," "Failed to get embeddings from Vertex AI."
-   `VectorSearchClient.generate_embeddings()` returns an error or empty results.

### Possible Causes:
1.  Issues listed under "Connection & Authentication Issues."
2.  Problems with the text input (e.g., empty, too long for the model's context window).
3.  Issues with the specified embedding model ID (if configurable beyond default).
4.  Vertex AI Prediction endpoint for embeddings is experiencing issues or quota limits.

### Solutions:
1.  Resolve any connection/authentication issues first.
2.  **Check Input Text:** Ensure the text being sent for embedding is valid, non-empty, and within model limits.
3.  **Verify Embedding Model:** Confirm the embedding model being used (e.g., `text-embedding-004`) is available and correctly configured in `VectorSearchClient` if it's not using a hardcoded default.
4.  **Check Quotas:** In GCP Console, check quotas for "Vertex AI API" > "Online prediction" requests for your embedding model.
5.  **Review Logs:** Check VANA logs for detailed error messages from `VectorSearchClient` or the Vertex AI SDK.

## 3. Search (Find Neighbors) Issues

### Symptoms:
-   `VectorSearchClient.find_neighbors()` returns errors, empty results, or irrelevant results.
-   Error messages like "must be real number, not str" (a historical issue, but type mismatches can still occur).
-   High search latency.

### Possible Causes:
1.  Issues listed under "Connection & Authentication Issues."
2.  **Incorrect Query Embedding:**
    *   Query text was not correctly embedded before searching.
    *   Embedding vector has incorrect dimensions or data types (e.g., strings instead of floats).
3.  **Index Issues:**
    *   The Vector Search index is empty or contains very little data.
    *   The `DEPLOYED_INDEX_ID` is incorrect or points to an unhealthy index.
    *   Data in the index is not representative of the query (poor quality embeddings, different domain).
4.  **Search Parameters:** Incorrect `num_neighbors` or incompatible filter conditions.
5.  **Data Type Mismatch (Historical Issue):** The "must be real number, not str" error specifically occurred when embedding values were passed as strings. The `VectorSearchClient` should now handle this by ensuring all embedding values are floats. If this error reappears, it indicates a regression or a new scenario where type conversion is missed.
6.  **High Latency:** Index not optimized, endpoint under-provisioned (though Vertex AI manages much of this), or network issues.

### Solutions:
1.  Resolve any connection/authentication/embedding generation issues first.
2.  **Verify Query Embedding:** Ensure the query embedding passed to `find_neighbors` is a list of floats with the correct dimensionality (e.g., 768 for `text-embedding-004`).
3.  **Check Index Content & Status:**
    *   Use GCP Console to inspect your Vector Search index: number of vectors, update status.
    *   If the index is new or small, results might be sparse or irrelevant. Consider uploading more representative data.
4.  **Test with `VectorSearchHealthChecker`:** `python scripts/test_vector_search_health.py --mode detailed` includes a sample query test.
5.  **Simplify Query/Parameters:** Try a very simple query and a small `num_neighbors` without filters to isolate the issue.
6.  **Review `VectorSearchClient` Implementation:** For persistent type errors, ensure all parts of the client that handle or generate embeddings correctly convert values to `float`.
7.  **Monitor Performance:** Use the VANA Monitoring Dashboard to check Vector Search latency trends.

## 4. Data Upsertion/Removal Issues (Conceptual)

### Symptoms:
-   `VectorSearchClient.upsert_datapoints()` or `remove_datapoints()` fails.
-   Index content does not update as expected after an upsert operation.

### Possible Causes:
1.  Issues listed under "Connection & Authentication Issues."
2.  **Incorrect Data Format for Upsertion:**
    *   JSONL file not correctly formatted (`{"id": "...", "embedding": [...], ...}`).
    *   Embedding dimensions in the file do not match the index configuration.
    *   Invalid characters or structure in the JSONL.
3.  **GCS Issues:**
    *   Problems uploading the JSONL file to GCS (permissions, bucket not found).
    *   Incorrect GCS URI provided to the Vertex AI index update method.
4.  **Index Update Operation Failures:** The long-running index update operation in Vertex AI might fail. Check its status in GCP Console.
5.  **Datapoint IDs for Removal Not Found:** Attempting to remove IDs that don't exist in the index.

### Solutions:
1.  Resolve any connection/authentication issues.
2.  **Validate JSONL Format:** Carefully check the structure and content of your JSONL files for upsertion. Ensure embedding vectors are lists of floats.
3.  **Check GCS Bucket/Permissions:**
    *   Ensure the GCS bucket exists and the service account has "Storage Object Admin" or "Storage Object Creator/Viewer" permissions on it.
    *   Verify the GCS URI format (`gs://bucket-name/path/to/file.jsonl`).
4.  **Monitor Index Update Operations:** In GCP Console under Vertex AI > Vector Search > Indexes, find your index and check the status of update/upsert operations.
5.  **Review Logs:** Check VANA logs and Google Cloud Logging for detailed error messages related to data management operations.

## 5. General Debugging Steps

1.  **Enable Detailed Logging:** Set `LOG_LEVEL=DEBUG` in your `.env` file to get more verbose output from VANA components, including `VectorSearchClient`.
2.  **Use `scripts/test_vector_search_health.py`:** This is your first line of defense for diagnosing issues.
3.  **Consult GCP Console:** Directly inspect your Vertex AI Vector Search Endpoints and Indexes in the Google Cloud Console for status, configuration, and operational logs.
4.  **Refer to VANA Documentation:**
    *   [VectorSearchClient Usage Guide](../guides/vector-search-client-usage.md)
    *   [VectorSearchClient Implementation](vector-search-client.md)
    *   [Interpreting Vector Search Health Reports Guide](../guides/vector-search-health-reports.md)
    *   [Google Cloud Vector Search Documentation](https://cloud.google.com/vertex-ai/docs/vector-search/overview)

By systematically checking these areas, you can diagnose and resolve most common issues with VANA's Vector Search integration.

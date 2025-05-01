# Vector Search Troubleshooting Guide

This guide provides solutions for common issues with the Vector Search integration in the VANA system.

## Table of Contents

1. [Connection Issues](#connection-issues)
2. [Embedding Generation Issues](#embedding-generation-issues)
3. [Search Issues](#search-issues)
4. [ADK Integration Issues](#adk-integration-issues)
5. [Knowledge Sync Issues](#knowledge-sync-issues)

## Connection Issues

### Cannot connect to Vector Search endpoint

**Symptoms:**
- Error message: "Failed to find Vector Search endpoint"
- Error message: "Could not find Vector Search endpoint. Please check the configuration."

**Possible Causes:**
1. Incorrect environment variables
2. Missing or invalid service account credentials
3. Network connectivity issues
4. Vector Search endpoint does not exist or is not accessible

**Solutions:**
1. Verify environment variables:
   ```bash
   echo $GOOGLE_CLOUD_PROJECT
   echo $GOOGLE_CLOUD_LOCATION
   echo $VECTOR_SEARCH_INDEX_NAME
   echo $DEPLOYED_INDEX_ID
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```

2. Check service account credentials:
   ```bash
   gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
   ```

3. Verify network connectivity:
   ```bash
   curl -I https://aiplatform.googleapis.com
   ```

4. Check if the Vector Search endpoint exists:
   ```bash
   gcloud ai index-endpoints list --region=$GOOGLE_CLOUD_LOCATION
   ```

## Embedding Generation Issues

### Cannot generate embeddings

**Symptoms:**
- Error message: "Error generating embedding"
- Error message: "The text content is empty"

**Possible Causes:**
1. Empty or invalid text input
2. Missing or invalid service account credentials
3. Vertex AI API not enabled
4. Rate limiting or quota issues

**Solutions:**
1. Ensure text input is not empty:
   ```python
   if not text.strip():
       return "Text input cannot be empty"
   ```

2. Check service account permissions:
   ```bash
   python check_permissions.py
   ```

3. Enable Vertex AI API:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

4. Check quota usage in Google Cloud Console

## Search Issues

### No search results returned

**Symptoms:**
- Message: "No results found for query"
- Empty results list

**Possible Causes:**
1. Vector Search index is empty
2. Query is too specific or unrelated to indexed content
3. Deployed index ID is incorrect
4. Index is not properly deployed
5. Permission issues with Vector Search

**Solutions:**
1. Verify index has content:
   ```bash
   python scripts/verify_vector_search.py
   ```

2. Try a more general query:
   ```bash
   python tools/search_knowledge_tool.py
   # Enter a more general query
   ```

3. Check deployed index ID:
   ```bash
   gcloud ai index-endpoints list-deployed-indexes $ENDPOINT_ID --region=$GOOGLE_CLOUD_LOCATION
   ```

4. Verify index deployment:
   ```bash
   python check_deployment.py
   ```

5. Test with mock implementation:
   ```bash
   python scripts/test_mock_vector_search.py "your query"
   ```

6. Check if the system is using the mock implementation:
   ```bash
   python scripts/test_vector_search.py --force-mock "your query"
   ```

### Poor search results quality

**Symptoms:**
- Irrelevant search results
- Low relevance scores

**Possible Causes:**
1. Insufficient or low-quality content in the index
2. Query formulation issues
3. Embedding model limitations

**Solutions:**
1. Add more high-quality content to the index:
   ```bash
   python populate_vector_search.py
   ```

2. Improve query formulation:
   - Be more specific
   - Use domain-specific terminology
   - Include context in the query

3. Consider using a different embedding model or fine-tuning

## ADK Integration Issues

### Cannot import google.adk module

**Symptoms:**
- Error message: "No module named 'google.adk'"
- Import errors in agent code

**Possible Causes:**
1. Google ADK package not installed
2. Incorrect Python environment
3. Incompatible ADK version

**Solutions:**
1. Install the Google ADK package:
   ```bash
   pip install google-adk
   ```

2. Activate the correct Python environment:
   ```bash
   source .venv/bin/activate
   ```

3. Check for specific version requirements:
   ```bash
   pip install google-adk==<version>
   ```

4. Check if the ADK is installed correctly:
   ```bash
   pip show google-adk
   ```

### Agents cannot access Vector Search

**Symptoms:**
- Agents do not use knowledge from Vector Search
- Error messages in agent logs

**Possible Causes:**
1. search_knowledge_tool not properly integrated
2. Agent instructions do not include knowledge usage guidelines
3. Vector Search integration issues

**Solutions:**
1. Verify search_knowledge_tool integration:
   ```python
   # Check if the tool is included in the agent's tools
   print(agent.tools)
   ```

2. Update agent instructions to include knowledge usage guidelines

3. Test Vector Search integration directly:
   ```bash
   python scripts/test_vector_search_direct.py
   ```

## Knowledge Sync Issues

### Knowledge sync fails

**Symptoms:**
- Error messages in GitHub Actions logs
- Knowledge base not updated

**Possible Causes:**
1. Missing or invalid GitHub secrets
2. StreamUpdate not enabled on the index
3. Service account permissions issues
4. Rate limiting or quota issues

**Solutions:**
1. Verify GitHub secrets:
   - GOOGLE_CLOUD_PROJECT
   - GOOGLE_CLOUD_LOCATION
   - GOOGLE_STORAGE_BUCKET
   - GCP_SERVICE_ACCOUNT_KEY

2. Check if StreamUpdate is enabled:
   ```bash
   gcloud ai indexes describe $INDEX_ID --region=$GOOGLE_CLOUD_LOCATION
   ```

3. Verify service account permissions:
   ```bash
   python check_permissions.py
   ```

4. Use batch updates instead of streaming updates:
   - Export embeddings to Google Cloud Storage
   - Update the index using the Google Cloud Console or API

## Additional Resources

- [Vector Search Verification Script](../verify_vector_search.py)
- [Direct Vector Search Test Script](../scripts/test_vector_search_direct.py)
- [Knowledge Sync Documentation](../scripts/github_sync/README.md)
- [Google Cloud Vector Search Documentation](https://cloud.google.com/vertex-ai/docs/vector-search/overview)
- [Vertex AI Embeddings Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings)

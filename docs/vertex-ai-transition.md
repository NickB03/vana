# Transitioning from Ragie.ai to Vertex AI Vector Search

This document outlines the process of transitioning the VANA memory system from Ragie.ai to Vertex AI Vector Search.

## Overview

The VANA memory system has evolved through multiple phases:

1. **Phase 1**: Initial implementation using Ragie.ai as the external vector database
2. **Phase 2**: Integration with n8n and MCP for workflow orchestration
3. **Phase 3**: Enhanced memory operations with filtering, tagging, and analytics
4. **Phase 4 (Current)**: Transition to Vertex AI Vector Search and integration with MCP Knowledge Graph

This document focuses on the transition from Ragie.ai to Vertex AI Vector Search in Phase 4.

## Motivation

The transition to Vertex AI Vector Search offers several advantages:

1. **Scalability**: Better handling of large knowledge bases
2. **Performance**: Faster query response times
3. **Integration**: Seamless integration with other Google Cloud services
4. **Cost-effectiveness**: More predictable pricing for production use
5. **Control**: Greater control over the vector search infrastructure

## Migration Steps

### 1. Set Up Google Cloud Project

1. Create or select a Google Cloud project
2. Enable the Vertex AI API
3. Create a service account with the following roles:
   - Vertex AI User
   - Storage Object Admin
4. Generate a service account key and store it securely

### 2. Configure Environment Variables

Update the `.env` file with the following variables:

```
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your_google_cloud_project_id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Vector Search Configuration
VECTOR_SEARCH_INDEX_ID=your_vector_search_index_id
VECTOR_SEARCH_ENDPOINT_ID=your_vector_search_endpoint_id
DEPLOYED_INDEX_ID=your_deployed_index_id
```

### 3. Create Vector Search Index

1. Create a Vector Search index with the following configuration:
   ```bash
   gcloud ai indexes create \
     --display-name=vana-memory-index \
     --metadata-file=index_config.json \
     --project=$GOOGLE_CLOUD_PROJECT \
     --region=$GOOGLE_CLOUD_LOCATION
   ```

2. Create a Vector Search endpoint:
   ```bash
   gcloud ai index-endpoints create \
     --display-name=vana-memory-endpoint \
     --project=$GOOGLE_CLOUD_PROJECT \
     --region=$GOOGLE_CLOUD_LOCATION
   ```

3. Deploy the index to the endpoint:
   ```bash
   gcloud ai index-endpoints deploy-index \
     --index=$VECTOR_SEARCH_INDEX_ID \
     --index-endpoint=$VECTOR_SEARCH_ENDPOINT_ID \
     --deployed-index-id=vanasharedindex \
     --machine-type=e2-standard-2 \
     --project=$GOOGLE_CLOUD_PROJECT \
     --region=$GOOGLE_CLOUD_LOCATION
   ```

### 4. Migrate Data from Ragie.ai

1. Export data from Ragie.ai:
   ```python
   import requests

   def export_from_ragie(api_key):
       headers = {"Authorization": f"Bearer {api_key}"}
       response = requests.get("https://api.ragie.ai/export", headers=headers)
       return response.json()

   ragie_data = export_from_ragie(os.environ.get("RAGIE_API_KEY"))
   ```

2. Transform data for Vertex AI:
   ```python
   from google.cloud import aiplatform

   def transform_for_vertex(ragie_data):
       transformed_data = []

       for item in ragie_data:
           transformed_data.append({
               "content": item["content"],
               "metadata": {
                   "source": item.get("source", "ragie_export"),
                   "timestamp": item.get("timestamp", ""),
                   "tags": ",".join(item.get("tags", []))
               }
           })

       return transformed_data

   vertex_data = transform_for_vertex(ragie_data)
   ```

3. Generate embeddings and upload to Vector Search:
   ```python
   def generate_embeddings(text_list):
       endpoint = f"https://{os.environ.get('GOOGLE_CLOUD_LOCATION')}-aiplatform.googleapis.com/v1/projects/{os.environ.get('GOOGLE_CLOUD_PROJECT')}/locations/{os.environ.get('GOOGLE_CLOUD_LOCATION')}/publishers/google/models/text-embedding-004:predict"

       embeddings = []
       for text in text_list:
           response = requests.post(
               endpoint,
               headers={"Authorization": f"Bearer {get_auth_token()}"},
               json={"instances": [{"content": text}]}
           )
           embeddings.append(response.json()["predictions"][0]["embeddings"])

       return embeddings

   def upload_to_vector_search(data, embeddings):
       index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
           index_endpoint_name=os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
       )

       datapoints = []
       for i, (item, embedding) in enumerate(zip(data, embeddings)):
           datapoints.append({
               "id": str(uuid.uuid4()),
               "feature_vector": embedding,
               "restricts": item["metadata"]
           })

       # Use batch update instead of StreamUpdate
       index_endpoint.upsert_datapoints(
           deployed_index_id=os.environ.get("DEPLOYED_INDEX_ID"),
           datapoints=datapoints
       )

   # Generate embeddings for all content
   content_list = [item["content"] for item in vertex_data]
   embeddings = generate_embeddings(content_list)

   # Upload to Vector Search
   upload_to_vector_search(vertex_data, embeddings)
   ```

### 5. Update n8n Workflows

1. Update the Manual Memory Save Workflow:
   - Replace Ragie API calls with Vertex AI API calls
   - Update the embedding generation step
   - Update the vector upload step

2. Update the Daily Memory Sync Workflow:
   - Replace Ragie API calls with Vertex AI API calls
   - Update the embedding generation step
   - Update the vector upload step

### 6. Update Memory Tools

1. Create a new Vector Search client:
   ```python
   class VectorSearchClient:
       def __init__(self):
           self.project = os.environ.get("GOOGLE_CLOUD_PROJECT")
           self.location = os.environ.get("GOOGLE_CLOUD_LOCATION")
           self.endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
           self.deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID")

           # Initialize Vertex AI
           aiplatform.init(project=self.project, location=self.location)

           # Get the index endpoint
           self.index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
               index_endpoint_name=self.endpoint_id
           )

       def is_available(self):
           """Check if Vector Search is available"""
           try:
               # Simple test query
               self.index_endpoint.match(
                   deployed_index_id=self.deployed_index_id,
                   queries=[{"datapoint": [0.0] * 768}],
                   num_neighbors=1
               )
               return True
           except Exception:
               return False

       def generate_embedding(self, text):
           """Generate embedding for text"""
           endpoint = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project}/locations/{self.location}/publishers/google/models/text-embedding-004:predict"

           response = requests.post(
               endpoint,
               headers={"Authorization": f"Bearer {self._get_auth_token()}"},
               json={"instances": [{"content": text}]}
           )

           return response.json()["predictions"][0]["embeddings"]

       def search(self, query, top_k=5):
           """Search for relevant content"""
           # Generate embedding for the query
           query_embedding = self.generate_embedding(query)

           # Search the index
           response = self.index_endpoint.match(
               deployed_index_id=self.deployed_index_id,
               queries=[{"datapoint": query_embedding}],
               num_neighbors=top_k
           )

           # Format results
           results = []
           for match in response[0]:
               results.append({
                   "content": match.document,
                   "score": match.distance,
                   "metadata": match.restricts
               })

           return results

       def _get_auth_token(self):
           """Get authentication token"""
           # Implementation depends on your authentication method
           # This is a placeholder
           return os.environ.get("GOOGLE_AUTH_TOKEN")
   ```

2. Update the search_knowledge_tool.py file to use the new client:
   ```python
   from vector_search.vector_search_client import VectorSearchClient

   def search_knowledge(query, top_k=5):
       """Search for relevant knowledge using Vector Search"""
       client = VectorSearchClient()

       if not client.is_available():
           return "Error: Vector Search client not available"

       try:
           results = client.search(query, top_k=top_k)
           return _format_results(results)
       except Exception as e:
           print(f"Error searching knowledge: {e}")
           return f"Error searching knowledge: {str(e)}"

   def _format_results(results):
       """Format results for display"""
       if not results:
           return "No relevant knowledge found."

       formatted = "Relevant knowledge:\n\n"

       for i, result in enumerate(results, 1):
           content = result.get("content", "")
           score = result.get("score", 0)

           # Truncate long content
           if len(content) > 200:
               content = content[:197] + "..."

           formatted += f"{i}. (Score: {score:.2f})\n{content}\n\n"

       return formatted
   ```

### 7. Implement Fallback Mechanism

Create an AgentProxy class that falls back to Knowledge Graph when Vector Search is unavailable:

```python
class AgentProxy:
    def __init__(self):
        self.vector_search_client = VectorSearchClient()
        self.kg_manager = KnowledgeGraphManager()

    def search_knowledge(self, query, top_k=5):
        """Search for relevant knowledge using Vector Search or Knowledge Graph"""
        try:
            # Try using Vector Search first
            if self.vector_search_client.is_available():
                results = self.vector_search_client.search(query, top_k=top_k)
                if results and len(results) > 0:
                    return self._format_search_results(results)

            # Fall back to Knowledge Graph if Vector Search fails or returns no results
            kg_results = self.kg_manager.query("*", query)
            if kg_results and kg_results.get("entities"):
                return self._format_kg_results(kg_results["entities"])

            return "No relevant knowledge found."
        except Exception as e:
            print(f"Error searching knowledge: {e}")
            return f"Error searching knowledge: {str(e)}"
```

## Testing the Transition

### 1. Test Vector Search Setup

```bash
python scripts/test_vector_search.py
```

### 2. Test Data Migration

```bash
python scripts/test_data_migration.py
```

### 3. Test n8n Workflows

1. Test the Manual Memory Save Workflow
2. Test the Daily Memory Sync Workflow

### 4. Test Memory Tools

```bash
python scripts/test_memory_tools.py
```

### 5. Test Fallback Mechanism

```bash
python scripts/test_fallback.py
```

## Monitoring and Maintenance

### 1. Monitor Vector Search Usage

Monitor the following metrics in Google Cloud Console:
- Query volume
- Query latency
- Error rates
- Cost

### 2. Regular Backups

Implement regular backups of the Vector Search index:

```bash
# Export index data to Cloud Storage
gcloud ai indexes export \
  --index=$VECTOR_SEARCH_INDEX_ID \
  --output-dir=gs://$BACKUP_BUCKET/vector-search-backups/$(date +%Y-%m-%d) \
  --project=$GOOGLE_CLOUD_PROJECT \
  --region=$GOOGLE_CLOUD_LOCATION
```

### 3. Health Checks

Implement regular health checks for the Vector Search service:

```python
def check_vector_search_health():
    client = VectorSearchClient()

    if not client.is_available():
        # Send alert
        send_alert("Vector Search is not available")
        return False

    # Test with a simple query
    results = client.search("test query", top_k=1)

    if not results:
        # Send alert
        send_alert("Vector Search returned no results")
        return False

    return True
```

## Hybrid Search Implementation

The hybrid search implementation combines results from both Vector Search and Knowledge Graph:

```python
class HybridSearch:
    def __init__(self, vector_search_client=None, kg_manager=None):
        """Initialize the hybrid search

        Args:
            vector_search_client: Optional VectorSearchClient instance
            kg_manager: Optional KnowledgeGraphManager instance
        """
        self.vector_search_client = vector_search_client or VectorSearchClient()
        self.kg_manager = kg_manager or KnowledgeGraphManager()

    def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """Search for relevant information using Vector Search and Knowledge Graph

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Dictionary containing vector_search results, knowledge_graph results,
            combined results, and any error messages
        """
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "combined": [],
            "error": None
        }

        # Get Vector Search results
        if self.vector_search_client.is_available():
            vector_results = self.vector_search_client.search(query, top_k=top_k)
            results["vector_search"] = vector_results

        # Get Knowledge Graph results
        if self.kg_manager.is_available():
            kg_results = self.kg_manager.query("*", query)
            results["knowledge_graph"] = kg_results.get("entities", [])

        # Combine results
        results["combined"] = self._combine_results(
            results["vector_search"],
            results["knowledge_graph"],
            top_k=top_k
        )

        return results
```

This approach leverages the strengths of both semantic search and structured knowledge.

## Enhanced Hybrid Search

The enhanced hybrid search extends the basic hybrid search by adding web search integration:

```python
class EnhancedHybridSearch(HybridSearch):
    def __init__(self, vector_search_client=None, kg_manager=None, web_search_client=None):
        """Initialize the enhanced hybrid search

        Args:
            vector_search_client: Optional VectorSearchClient instance
            kg_manager: Optional KnowledgeGraphManager instance
            web_search_client: Optional WebSearchClient instance
        """
        super().__init__(vector_search_client, kg_manager)
        self.web_search_client = web_search_client or WebSearchClient()

    def search(self, query: str, top_k: int = 5, include_web: bool = True) -> Dict[str, Any]:
        """Search for relevant information using Vector Search, Knowledge Graph, and Web Search

        Args:
            query: The search query
            top_k: Maximum number of results to return
            include_web: Whether to include web search results

        Returns:
            Dictionary containing vector_search results, knowledge_graph results,
            web_search results, combined results, and any error messages
        """
        results = {
            "vector_search": [],
            "knowledge_graph": [],
            "web_search": [],
            "combined": [],
            "error": None
        }

        # Get Vector Search and Knowledge Graph results
        basic_results = super().search(query, top_k=top_k)
        results["vector_search"] = basic_results["vector_search"]
        results["knowledge_graph"] = basic_results["knowledge_graph"]

        # Get Web Search results if requested
        if include_web and self.web_search_client.is_available():
            web_results = self.web_search_client.search(query, num_results=top_k)
            results["web_search"] = web_results

        # Combine results
        results["combined"] = self._combine_results(
            results["vector_search"],
            results["knowledge_graph"],
            results["web_search"],
            top_k=top_k
        )

        return results
```

This approach provides the most comprehensive results by combining:
- Semantic understanding from Vector Search
- Structured knowledge from Knowledge Graph
- Up-to-date information from Web Search

The web search component uses the Google Custom Search API to retrieve recent information from the web, ensuring that the system has access to the latest information even if it's not in the knowledge base.

## Conclusion

The transition from Ragie.ai to Vertex AI Vector Search provides a more scalable, performant, and integrated solution for the VANA memory system. By following the steps outlined in this document, you can successfully migrate your existing memory data and update your tools and workflows to use the new Vector Search infrastructure. The addition of hybrid search and enhanced hybrid search capabilities further improves the system's ability to provide comprehensive and relevant information to users.

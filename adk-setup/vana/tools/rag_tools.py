from google.adk.toolkit import tool
from google.cloud import aiplatform
from typing import List, Dict

@tool
def search_knowledge(query: str) -> str:
    """Search the shared knowledge base for relevant information.
    
    Args:
        query: Search query text
        
    Returns:
        Relevant search results from the vector store
    """
    try:
        # Initialize vector search endpoint  
        index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
            index_endpoint_name="projects/analystai-454200/locations/us-central1/indexEndpoints/vana-shared-index"
        )
        
        # Generate embedding for query
        embedding = generate_embedding(query)
        
        # Search for similar content
        results = index_endpoint.find_neighbors(
            deployed_index_id="vana-index",
            queries=[embedding],
            num_neighbors=5
        )
        
        # Format and return results
        return format_search_results(results)
    except Exception as e:
        return f"Knowledge search error: {str(e)}"

def generate_embedding(text: str) -> List[float]:
    """Generate embedding for text using Vertex AI."""
    # Using Vertex AI embeddings for text
    model = aiplatform.TextEmbeddingModel.from_pretrained("text-embedding-004")
    embeddings = model.get_embeddings([text])
    return embeddings[0].values

def format_search_results(results: List[Dict]) -> str:
    """Format vector search results into readable text."""
    if not results:
        return "No relevant information found in knowledge base."
    
    formatted = "Relevant information from knowledge base:\n\n"
    for i, result in enumerate(results, 1):
        formatted += f"{i}. {result.get('text', 'No text available')}\n"
        formatted += f"   Similarity: {result.get('similarity', 'N/A')}\n\n"
    
    return formatted

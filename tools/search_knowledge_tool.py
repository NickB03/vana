#!/usr/bin/env python3
"""
Search Knowledge Tool for VANA.

This tool allows agents to search the shared knowledge base using Vector Search.
It generates embeddings for the query using Vertex AI and searches the Vector Search index
for similar documents.
"""

import os
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.cloud import aiplatform
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
DEPLOYED_INDEX_ID = "vanasharedindex"  # From the check_deployment.py output

def generate_embedding(text):
    """Generate an embedding for a text using Vertex AI."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Use the text-embedding-004 model
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    
    # Generate embedding
    embedding = model.get_embeddings([text])[0]
    
    return embedding.values

def search_knowledge_tool(query, top_k=5):
    """
    Search the knowledge base for information related to the query.
    
    Args:
        query (str): The search query.
        top_k (int): The number of results to return.
        
    Returns:
        str: A formatted string containing the search results.
    """
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Generate embedding for the query
        query_embedding = generate_embedding(query)
        
        # Get all index endpoints
        endpoints = aiplatform.MatchingEngineIndexEndpoint.list()
        
        if not endpoints:
            return "No index endpoints found. Please set up Vector Search first."
        
        # Use the first endpoint
        endpoint = endpoints[0]
        
        # Search the index
        try:
            response = endpoint.find_neighbors(
                deployed_index_id=DEPLOYED_INDEX_ID,
                queries=[query_embedding],
                num_neighbors=top_k
            )
            
            # Process the results
            if response and len(response) > 0 and len(response[0]) > 0:
                results = response[0]
                
                # Format the results
                formatted_results = f"Found {len(results)} results for query: '{query}'\n\n"
                
                for i, result in enumerate(results):
                    formatted_results += f"Result {i+1}:\n"
                    formatted_results += f"  Distance: {result.distance}\n"
                    
                    # Extract metadata if available
                    if hasattr(result, "metadata") and result.metadata:
                        if "title" in result.metadata:
                            formatted_results += f"  Title: {result.metadata['title']}\n"
                        
                        if "source" in result.metadata:
                            formatted_results += f"  Source: {result.metadata['source']}\n"
                        
                        if "text" in result.metadata:
                            # Truncate long text
                            text = result.metadata["text"]
                            text = text[:500] + "..." if len(text) > 500 else text
                            formatted_results += f"  Content: {text}\n"
                    
                    formatted_results += "\n"
                
                return formatted_results
            else:
                return f"No results found for query: '{query}'"
        
        except Exception as e:
            return f"Error searching Vector Search index: {str(e)}"
    
    except Exception as e:
        return f"Error in search_knowledge_tool: {str(e)}"

# Test the tool if run directly
if __name__ == "__main__":
    query = input("Enter your search query: ")
    results = search_knowledge_tool(query)
    print(results)

#!/usr/bin/env python3
"""
Test the Vector Search functionality by searching for similar documents.
"""

import os
from dotenv import load_dotenv
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.cloud import aiplatform

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

def generate_embedding(text):
    """Generate an embedding for a text using Vertex AI."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Use the text-embedding-004 model
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    
    print(f"Generating embedding for query...")
    embedding = model.get_embeddings([text])[0]
    
    return embedding.values

def search_vector_index(query_embedding, index, top_k=5):
    """Search the Vector Search index for similar documents."""
    # Get the deployed indexes
    deployed_indexes = index.deployed_indexes
    
    if not deployed_indexes:
        print("No deployed indexes found. Please deploy the index first.")
        return []
    
    # Get the first deployed index endpoint
    deployed_index = deployed_indexes[0]
    endpoint = deployed_index.index_endpoint
    
    print(f"Using deployed index: {deployed_index.deployed_index_id}")
    print(f"Endpoint: {endpoint.resource_name}")
    
    # Search the index
    response = endpoint.find_neighbors(
        deployed_index_id=deployed_index.deployed_index_id,
        queries=[query_embedding],
        num_neighbors=top_k
    )
    
    return response[0]

def main():
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    
    # Get the Vector Search index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )
    
    if not indexes:
        print(f"Index '{INDEX_NAME}' not found.")
        return
    
    index = indexes[0]
    print(f"Using index: {index.display_name} (ID: {index.name})")
    
    # Get a query from the user
    query = input("Enter your search query: ")
    
    # Generate embedding for the query
    query_embedding = generate_embedding(query)
    
    # Search the index
    results = search_vector_index(query_embedding, index)
    
    # Display the results
    if results:
        print(f"\nFound {len(results)} results:")
        for i, result in enumerate(results):
            print(f"\nResult {i+1}:")
            print(f"  Distance: {result.distance}")
            print(f"  ID: {result.id}")
            
            # Try to extract metadata if available
            if hasattr(result, "metadata") and result.metadata:
                print(f"  Metadata:")
                for key, value in result.metadata.items():
                    if key == "text":
                        # Truncate long text
                        text = value[:200] + "..." if len(value) > 200 else value
                        print(f"    {key}: {text}")
                    else:
                        print(f"    {key}: {value}")
    else:
        print("No results found.")

if __name__ == "__main__":
    main()

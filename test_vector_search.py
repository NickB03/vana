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
    try:
        print("🔍 Testing Vector Search integration...")

        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)

        # Try two approaches: first with index list, then with endpoint list
        try:
            # Approach 1: Get the Vector Search index
            indexes = aiplatform.MatchingEngineIndex.list(
                filter=f"display_name={INDEX_NAME}"
            )

            if not indexes:
                print(f"⚠️ Index '{INDEX_NAME}' not found. Trying alternative approach...")
                raise ValueError("Index not found")

            index = indexes[0]
            print(f"Using index: {index.display_name} (ID: {index.name})")

            # Get a query from the user or use default
            query = input("Enter your search query (or press Enter for default): ")
            if not query.strip():
                query = "What is the architecture of VANA agents?"
                print(f"Using default query: '{query}'")

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

                print("\n✅ Vector Search test successful!")
            else:
                print("⚠️ No results found.")

        except Exception as e:
            print(f"⚠️ First approach failed: {str(e)}")
            print("Trying alternative approach with endpoints...")

            # Approach 2: Get the index endpoint directly
            endpoints = aiplatform.MatchingEngineIndexEndpoint.list()

            if not endpoints:
                print("❌ No index endpoints found.")
                return

            # Use the first endpoint
            endpoint = endpoints[0]
            print(f"Using endpoint: {endpoint.display_name} ({endpoint.name})")

            # Get the deployed indexes
            deployed_indexes = endpoint.deployed_indexes

            if not deployed_indexes:
                print("❌ No deployed indexes found.")
                return

            # Use the first deployed index
            deployed_index = deployed_indexes[0]
            deployed_index_id = deployed_index.deployed_index_id
            print(f"Using deployed index: {deployed_index_id}")

            # Get a query from the user or use default
            query = input("Enter your search query (or press Enter for default): ")
            if not query.strip():
                query = "What is the architecture of VANA agents?"
                print(f"Using default query: '{query}'")

            # Generate embedding for the query
            query_embedding = generate_embedding(query)

            # Search for neighbors
            print(f"Searching for documents similar to: '{query}'")
            results = endpoint.find_neighbors(
                deployed_index_id=deployed_index_id,
                queries=[query_embedding],
                num_neighbors=5
            )

            # Process results
            if results and len(results) > 0:
                neighbors = results[0]
                print(f"\nFound {len(neighbors)} results:")

                for i, neighbor in enumerate(neighbors):
                    print(f"\nResult {i+1}:")
                    print(f"  Distance: {neighbor.distance}")

                    # Extract metadata if available
                    if hasattr(neighbor, "metadata") and neighbor.metadata:
                        print(f"  Metadata:")
                        for key, value in neighbor.metadata.items():
                            if key == "text":
                                # Truncate long text
                                text = value[:200] + "..." if len(value) > 200 else value
                                print(f"    {key}: {text}")
                            else:
                                print(f"    {key}: {value}")

                print("\n✅ Vector Search test successful!")
            else:
                print("❌ No results found.")

    except Exception as e:
        print(f"❌ Vector Search test failed: {str(e)}")

        # Print more detailed error information
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

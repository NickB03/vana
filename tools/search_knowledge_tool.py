#!/usr/bin/env python3
"""
Search Knowledge Tool for VANA.

This tool allows agents to search the shared knowledge base using Vector Search.
It generates embeddings for the query using Vertex AI and searches the Vector Search index
for similar documents.

This implementation uses the verified approach from verify_vector_search.py.
"""

import logging
import os

import vertexai
from dotenv import load_dotenv
from google.cloud import aiplatform
from vertexai.language_models import TextEmbeddingModel

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("search_knowledge.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
DEPLOYED_INDEX_ID = os.getenv("DEPLOYED_INDEX_ID", "vanasharedindex")

# Get endpoint resource name from environment variable
ENDPOINT_RESOURCE_NAME = os.getenv("VECTOR_SEARCH_ENDPOINT_ID")


def generate_embedding(text):
    """Generate an embedding for a text using Vertex AI."""
    try:
        # Initialize Vertex AI
        vertexai.init(project=PROJECT_ID, location=LOCATION)

        # Use the text-embedding-004 model
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")

        # Generate embedding
        embedding = model.get_embeddings([text])[0]

        return embedding.values
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        raise


def get_vector_search_endpoint():
    """Get the Vector Search endpoint using the verified approach."""
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)

        # Try multiple approaches to find the index and endpoint

        # Approach 1: Use the known endpoint resource name
        try:
            logger.info(f"Using known endpoint resource name: {ENDPOINT_RESOURCE_NAME}")
            endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=ENDPOINT_RESOURCE_NAME)
            return endpoint, DEPLOYED_INDEX_ID
        except Exception as e:
            logger.warning(f"Error using known endpoint resource name: {str(e)}")

        # Approach 2: Find index by display name
        try:
            logger.info(f"Finding index by display name: {INDEX_NAME}")
            indexes = aiplatform.MatchingEngineIndex.list(filter=f"display_name={INDEX_NAME}")

            if indexes:
                index = indexes[0]
                logger.info(f"Found index: {index.display_name} (ID: {index.name})")

                # Get endpoint from index
                if hasattr(index, "deployed_indexes") and index.deployed_indexes:
                    deployed_index = index.deployed_indexes[0]
                    endpoint_resource_name = deployed_index.index_endpoint
                    deployed_index_id = deployed_index.deployed_index_id

                    logger.info(f"Found deployed index: {deployed_index_id}")
                    logger.info(f"Found endpoint: {endpoint_resource_name}")

                    # Initialize the endpoint object
                    endpoint = aiplatform.MatchingEngineIndexEndpoint(index_endpoint_name=endpoint_resource_name)

                    return endpoint, deployed_index_id
        except Exception as e:
            logger.warning(f"Error finding index by display name: {str(e)}")

        # Approach 3: List all endpoints and use the first one
        try:
            logger.info("Listing all endpoints")
            endpoints = aiplatform.MatchingEngineIndexEndpoint.list()

            if endpoints:
                endpoint = endpoints[0]
                logger.info(f"Found endpoint: {endpoint.display_name} ({endpoint.name})")

                # Use the known deployed index ID
                logger.info(f"Using deployed index ID: {DEPLOYED_INDEX_ID}")

                return endpoint, DEPLOYED_INDEX_ID
        except Exception as e:
            logger.warning(f"Error listing endpoints: {str(e)}")

        # If all approaches fail, return None
        logger.error("Failed to find Vector Search endpoint")
        return None, None
    except Exception as e:
        logger.error(f"Error getting Vector Search endpoint: {str(e)}")
        return None, None


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
        logger.info(f"Searching knowledge base for: '{query}'")

        # Generate embedding for the query
        query_embedding = generate_embedding(query)

        # Get the Vector Search endpoint
        endpoint, deployed_index_id = get_vector_search_endpoint()

        if not endpoint or not deployed_index_id:
            return "Could not find Vector Search endpoint. Please check the configuration."

        # Search the index
        try:
            logger.info(f"Searching index with deployed_index_id: {deployed_index_id}")
            response = endpoint.find_neighbors(
                deployed_index_id=deployed_index_id,
                queries=[query_embedding],
                num_neighbors=top_k,
            )

            # Process the results
            if response and len(response) > 0 and len(response[0]) > 0:
                results = response[0]
                logger.info(f"Found {len(results)} results")

                # Format the results
                formatted_results = f"Found {len(results)} results for query: '{query}'\n\n"

                for i, result in enumerate(results):
                    formatted_results += f"Result {i + 1}:\n"
                    formatted_results += f"  Relevance: {result.distance:.4f}\n"

                    # Extract metadata if available
                    if hasattr(result, "metadata") and result.metadata:
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
                logger.warning("No results found")
                return f"No results found for query: '{query}'"

        except Exception as e:
            logger.error(f"Error searching Vector Search index: {str(e)}")
            return f"Error searching Vector Search index: {str(e)}"

    except Exception as e:
        logger.error(f"Error in search_knowledge_tool: {str(e)}")
        return f"Error in search_knowledge_tool: {str(e)}"


# Test the tool if run directly
if __name__ == "__main__":
    query = input("Enter your search query: ")
    results = search_knowledge_tool(query)
    logger.info("%s", results)

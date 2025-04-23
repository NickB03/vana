from google.adk.tools import FunctionTool
from google.cloud import aiplatform
import vertexai
from vertexai.language_models import TextEmbeddingModel
import os
import logging
from typing import List, Dict, Tuple, Any, Optional
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("agent_knowledge_search.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
DEPLOYED_INDEX_ID = os.getenv("DEPLOYED_INDEX_ID", "vanasharedindex")

# Known endpoint resource name from verification
ENDPOINT_RESOURCE_NAME = "projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504"

def generate_embedding(text: str) -> List[float]:
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

def get_vector_search_endpoint() -> Tuple[Any, str]:
    """Get the Vector Search endpoint using the verified approach."""
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)

        # Try multiple approaches to find the index and endpoint

        # Approach 1: Use the known endpoint resource name
        try:
            logger.info(f"Using known endpoint resource name: {ENDPOINT_RESOURCE_NAME}")
            endpoint = aiplatform.MatchingEngineIndexEndpoint(
                index_endpoint_name=ENDPOINT_RESOURCE_NAME
            )
            return endpoint, DEPLOYED_INDEX_ID
        except Exception as e:
            logger.warning(f"Error using known endpoint resource name: {str(e)}")

        # Approach 2: Find index by display name
        try:
            logger.info(f"Finding index by display name: {INDEX_NAME}")
            indexes = aiplatform.MatchingEngineIndex.list(
                filter=f"display_name={INDEX_NAME}"
            )

            if indexes:
                index = indexes[0]
                logger.info(f"Found index: {index.display_name} (ID: {index.name})")

                # Get endpoint from index
                if hasattr(index, 'deployed_indexes') and index.deployed_indexes:
                    deployed_index = index.deployed_indexes[0]
                    endpoint_resource_name = deployed_index.index_endpoint
                    deployed_index_id = deployed_index.deployed_index_id

                    logger.info(f"Found deployed index: {deployed_index_id}")
                    logger.info(f"Found endpoint: {endpoint_resource_name}")

                    # Initialize the endpoint object
                    endpoint = aiplatform.MatchingEngineIndexEndpoint(
                        index_endpoint_name=endpoint_resource_name
                    )

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

def format_search_results(results: Optional[List]) -> str:
    """Format vector search results into readable text."""
    if not results or len(results) == 0 or len(results[0]) == 0:
        return "No relevant information found in knowledge base."

    neighbors = results[0]
    formatted = "Relevant information from knowledge base:\n\n"

    for i, neighbor in enumerate(neighbors, 1):
        formatted += f"Result {i}:\n"
        formatted += f"  Relevance: {neighbor.distance:.4f}\n"

        # Extract metadata if available
        if hasattr(neighbor, "metadata") and neighbor.metadata:
            if "source" in neighbor.metadata:
                formatted += f"  Source: {neighbor.metadata['source']}\n"

            if "text" in neighbor.metadata:
                # Truncate long text
                text = neighbor.metadata["text"]
                text = text[:500] + "..." if len(text) > 500 else text
                formatted += f"  Content: {text}\n"

        formatted += "\n"

    return formatted

def search_knowledge(query: str, top_k: int = 5) -> str:
    """Search the shared knowledge base for relevant information.

    Args:
        query: Search query text
        top_k: Number of results to return (default: 5)

    Returns:
        Relevant search results from the vector store
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
                num_neighbors=top_k
            )

            # Format and return results
            return format_search_results(response)
        except Exception as e:
            logger.error(f"Error searching Vector Search index: {str(e)}")
            return f"Error searching knowledge base: {str(e)}"
    except Exception as e:
        logger.error(f"Error in search_knowledge: {str(e)}")
        return f"Knowledge search error: {str(e)}"

# Create function tool
search_knowledge_tool = FunctionTool(func=search_knowledge)

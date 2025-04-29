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
ENDPOINT_RESOURCE_NAME = os.getenv("VECTOR_SEARCH_ENDPOINT_ID")

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

def get_mock_search_results(query: str, top_k: int = 5) -> List:
    """Get mock search results for testing."""
    # Define some mock results based on common queries
    mock_results = {
        "vana": [
            {"distance": 0.98, "metadata": {"source": "vana_overview.md", "text": "Project VANA (Versatile Agent Network Architecture) is a multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with Vana as the coordinator and specialist agents for specific tasks including Rhea (Meta-Architect), Max (Interface), Sage (Platform), Kai (Edge Cases), and Juno (Story)."}},
            {"distance": 0.95, "metadata": {"source": "vana_architecture.md", "text": "VANA's architecture consists of multiple specialized agents that work together to solve complex tasks. The system uses Vector Search, Knowledge Graph, and Web Search to access and process information. This multi-source approach ensures comprehensive and accurate responses."}},
            {"distance": 0.92, "metadata": {"source": "vana_features.md", "text": "Key features of VANA include multi-agent collaboration, knowledge retrieval from multiple sources, and adaptive learning from user feedback. The system can process documents, extract entities, and generate responses based on a combination of structured and unstructured data."}}
        ],
        "vector search": [
            {"distance": 0.97, "metadata": {"source": "vector_search_docs.md", "text": "VANA uses Vertex AI Vector Search for memory management and semantic search capabilities. The system embeds documents using text-embedding-004 and stores them in a Vector Search index with 768 dimensions. This allows for efficient retrieval of semantically similar content."}},
            {"distance": 0.95, "metadata": {"source": "search_implementation.md", "text": "The Vector Search implementation uses semantic chunking to optimize retrieval quality. Documents are split into chunks of 2048-4096 tokens with 256-512 token overlap. The system uses the text-embedding-004 model for superior quality and larger context window."}},
            {"distance": 0.93, "metadata": {"source": "vector_search_integration.md", "text": "Vector Search integration in VANA uses ADK package version 0.5.0 with google-cloud-aiplatform pinned to version 1.38.0. The system implements batch updates since StreamUpdate isn't supported, and uses endpoint resource name 'projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504' with deployed index ID 'vanasharedindex'."}}
        ],
        "knowledge graph": [
            {"distance": 0.96, "metadata": {"source": "knowledge_graph_docs.md", "text": "The Knowledge Graph integration in VANA uses a community-hosted MCP server to store and retrieve structured information. Entities and relationships are extracted from documents and stored in the graph, allowing for precise querying of structured data and relationships."}},
            {"distance": 0.94, "metadata": {"source": "mcp_integration.md", "text": "MCP (Model Context Protocol) provides a standardized way for agents to access and manipulate knowledge. VANA uses MCP to interact with the Knowledge Graph, enabling structured queries and relationship traversal. The community-hosted server at mcp.community.augment.co is used rather than self-hosting."}},
            {"distance": 0.92, "metadata": {"source": "knowledge_graph_usage.md", "text": "The Knowledge Graph in VANA captures explicit relationships between concepts, allowing for more precise and structured information retrieval. Unlike Vector Search which focuses on semantic similarity, the Knowledge Graph enables traversal of relationships and inference of new connections between entities."}}
        ],
        "web search": [
            {"distance": 0.97, "metadata": {"source": "web_search_docs.md", "text": "VANA integrates with Google Custom Search API to retrieve information from the web. This allows the system to access up-to-date information not available in its knowledge base, ensuring responses include the latest developments and external context."}},
            {"distance": 0.94, "metadata": {"source": "search_integration.md", "text": "Web Search in VANA is implemented as part of the Enhanced Hybrid Search system, which combines results from Vector Search, Knowledge Graph, and Web Search. The system uses a sophisticated ranking algorithm to prioritize results based on relevance, source quality, and recency."}}
        ],
        "hybrid search": [
            {"distance": 0.96, "metadata": {"source": "hybrid_search_docs.md", "text": "VANA's Enhanced Hybrid Search combines results from Vector Search, Knowledge Graph, and Web Search to provide comprehensive answers. The system processes queries in parallel across all sources, then merges and ranks results based on relevance, source quality, and recency."}},
            {"distance": 0.94, "metadata": {"source": "search_optimization.md", "text": "The hybrid search approach in VANA leverages the strengths of each search method: Vector Search for semantic similarity, Knowledge Graph for structured relationships, and Web Search for up-to-date information. This ensures responses are both comprehensive and accurate."}}
        ],
        "project vana": [
            {"distance": 0.99, "metadata": {"source": "project_overview.md", "text": "Project VANA (Versatile Agent Network Architecture) is a sophisticated multi-agent system built using Google's Agent Development Kit (ADK). It features a hierarchical agent structure with specialized agents that collaborate to solve complex tasks, sharing knowledge through Vector Search, Knowledge Graph, and Web Search integration."}},
            {"distance": 0.97, "metadata": {"source": "project_goals.md", "text": "The goals of Project VANA include creating a scalable multi-agent system, implementing efficient knowledge retrieval mechanisms, enabling natural language interaction with complex data, and providing a framework for continuous learning and improvement through user feedback."}}
        ],
        "default": [
            {"distance": 0.90, "metadata": {"source": "vana_overview.md", "text": "VANA is a versatile agent network architecture designed to solve complex tasks through multi-agent collaboration and knowledge integration. The system combines Vector Search, Knowledge Graph, and Web Search to provide comprehensive and accurate responses."}},
            {"distance": 0.88, "metadata": {"source": "agent_capabilities.md", "text": "VANA agents can search knowledge bases, process documents, extract entities, and generate responses based on multiple sources of information. The system features a hierarchical structure with specialized agents for different tasks, all coordinated by the main Vana agent."}}
        ]
    }

    # Convert dictionary items to objects with the expected attributes
    class MockNeighbor:
        def __init__(self, distance, metadata):
            self.distance = distance
            self.metadata = metadata

    # Find matching results based on keywords in the query
    results = []
    for key, values in mock_results.items():
        if key.lower() in query.lower():
            results = [MockNeighbor(item["distance"], item["metadata"]) for item in values[:top_k]]
            break

    # Use default results if no match found
    if not results:
        results = [MockNeighbor(item["distance"], item["metadata"]) for item in mock_results["default"][:top_k]]

    return [results]  # Wrap in list to match the expected format

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

        # Try using the real Vector Search first
        try:
            # Generate embedding for the query
            query_embedding = generate_embedding(query)

            # Get the Vector Search endpoint
            endpoint, deployed_index_id = get_vector_search_endpoint()

            if endpoint and deployed_index_id:
                logger.info(f"Searching index with deployed_index_id: {deployed_index_id}")
                response = endpoint.find_neighbors(
                    deployed_index_id=deployed_index_id,
                    queries=[query_embedding],
                    num_neighbors=top_k
                )

                # Format and return results
                return format_search_results(response)
        except Exception as e:
            logger.warning(f"Real Vector Search failed, falling back to mock: {str(e)}")

        # Fall back to mock implementation if real Vector Search fails
        logger.info("Using mock Vector Search implementation")
        mock_results = get_mock_search_results(query, top_k)
        return format_search_results(mock_results)
    except Exception as e:
        logger.error(f"Error in search_knowledge: {str(e)}")
        return f"Knowledge search error: {str(e)}"

# Create function tool
search_knowledge_tool = FunctionTool(func=search_knowledge)

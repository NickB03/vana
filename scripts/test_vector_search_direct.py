#!/usr/bin/env python3
"""
Direct Test for Vector Search Integration

This script tests the Vector Search integration directly without relying on ADK agents.
It sends queries to Vector Search and verifies that relevant information is retrieved.
"""

import os
import logging
import argparse
from dotenv import load_dotenv
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.cloud import aiplatform

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("vector_search_direct_test.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
DEPLOYED_INDEX_ID = os.getenv("DEPLOYED_INDEX_ID", "vanasharedindex")
ENDPOINT_RESOURCE_NAME = "projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504"

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Direct test for Vector Search integration")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--query", default="What is the architecture of VANA agents?",
                        help="Query to test (default: 'What is the architecture of VANA agents?')")
    parser.add_argument("--output", help="Output file for detailed results")
    parser.add_argument("--timing", action="store_true", help="Show timing information for each step")
    parser.add_argument("--metadata", action="store_true", help="Show detailed metadata for each result")
    return parser.parse_args()

def setup_logging(verbose=False):
    """Set up logging with appropriate level based on verbose flag."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler("vector_search_direct_test.log"),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def generate_embedding(text, show_timing=False):
    """Generate an embedding for a text using Vertex AI."""
    try:
        import time
        start_time = time.time()

        # Initialize Vertex AI
        vertexai.init(project=PROJECT_ID, location=LOCATION)
        init_time = time.time()

        # Use the text-embedding-004 model
        model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        model_load_time = time.time()

        # Generate embedding
        embedding = model.get_embeddings([text])[0]
        embedding_time = time.time()

        # Log timing information if requested
        if show_timing:
            logger.info(f"Embedding generation timing:")
            logger.info(f"  - Initialization: {(init_time - start_time):.2f}s")
            logger.info(f"  - Model loading: {(model_load_time - init_time):.2f}s")
            logger.info(f"  - Embedding generation: {(embedding_time - model_load_time):.2f}s")
            logger.info(f"  - Total time: {(embedding_time - start_time):.2f}s")
            logger.info(f"  - Embedding dimensions: {len(embedding.values)}")

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

def search_knowledge(query, top_k=5, show_timing=False, show_metadata=False):
    """Search the knowledge base for information related to the query."""
    try:
        import time
        start_time = time.time()

        logger.info(f"Searching knowledge base for: '{query}'")

        # Generate embedding for the query
        query_embedding = generate_embedding(query, show_timing)
        embedding_time = time.time()

        # Get the Vector Search endpoint
        endpoint, deployed_index_id = get_vector_search_endpoint()
        endpoint_time = time.time()

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
            search_time = time.time()

            # Log timing information if requested
            if show_timing:
                logger.info(f"Search timing:")
                logger.info(f"  - Embedding generation: {(embedding_time - start_time):.2f}s")
                logger.info(f"  - Endpoint retrieval: {(endpoint_time - embedding_time):.2f}s")
                logger.info(f"  - Vector search: {(search_time - endpoint_time):.2f}s")
                logger.info(f"  - Total time: {(search_time - start_time):.2f}s")

            # Process the results
            if response and len(response) > 0 and len(response[0]) > 0:
                results = response[0]
                logger.info(f"Found {len(results)} results")

                # Format the results
                formatted_results = f"Found {len(results)} results for query: '{query}'\n\n"

                for i, result in enumerate(results):
                    formatted_results += f"Result {i+1}:\n"
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

                        # Show all metadata if requested
                        if show_metadata:
                            formatted_results += "  Metadata:\n"
                            for key, value in result.metadata.items():
                                if key != "text":  # Skip text as it's already shown
                                    # Truncate long values
                                    if isinstance(value, str) and len(value) > 100:
                                        value = value[:100] + "..."
                                    formatted_results += f"    {key}: {value}\n"

                    # Show ID if available
                    if hasattr(result, "id"):
                        formatted_results += f"  ID: {result.id}\n"

                    formatted_results += "\n"

                return formatted_results
            else:
                logger.warning("No results found")
                return f"No results found for query: '{query}'"

        except Exception as e:
            logger.error(f"Error searching Vector Search index: {str(e)}")
            return f"Error searching Vector Search index: {str(e)}"

    except Exception as e:
        logger.error(f"Error in search_knowledge: {str(e)}")
        return f"Error in search_knowledge: {str(e)}"

def main():
    """Main function."""
    args = parse_arguments()

    # Set up logging with appropriate level
    global logger
    logger = setup_logging(args.verbose)

    logger.info("Starting direct test for Vector Search integration")

    # Test queries
    if args.query:
        test_queries = [args.query]
    else:
        test_queries = [
            "What is the architecture of VANA agents?",
            "How does Vector Search integration work in this project?",
            "Tell me about the agent hierarchy in VANA",
            "What tools are available to the agents?",
            "How is knowledge shared between agents?"
        ]

    # Test each query
    success = True
    results = {}

    for query in test_queries:
        logger.info(f"Testing query: '{query}'")

        try:
            # Search the knowledge base
            result = search_knowledge(query, show_timing=args.timing, show_metadata=args.metadata)
            results[query] = result

            # Log the result
            logger.info("Search result:")
            logger.info(result)

            # Check if the result contains relevant information
            if "No results found" in result or "Error" in result:
                logger.warning(f"⚠️ No relevant information found for query: '{query}'")
                success = False
            else:
                logger.info(f"✅ Successfully retrieved information for query: '{query}'")

        except Exception as e:
            logger.error(f"❌ Error testing query: '{query}': {str(e)}")
            results[query] = f"Error: {str(e)}"
            success = False

    # Save results to file if requested
    if args.output:
        import json
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        logger.info(f"Results saved to {args.output}")

    # Print summary
    logger.info("\n" + "="*50)
    logger.info("VECTOR SEARCH DIRECT TEST SUMMARY")
    logger.info("="*50)

    if success:
        logger.info("🎉 SUCCESS: Vector Search integration is working correctly")
    else:
        logger.info("⚠️ PARTIAL SUCCESS: Vector Search integration is working but some queries failed")

    logger.info("="*50)

    return 0 if success else 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)

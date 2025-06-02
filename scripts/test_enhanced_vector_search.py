#!/usr/bin/env python3
"""
Test script for the enhanced Vector Search client

This script tests the enhanced Vector Search client with the following features:
- Proper type conversion for embeddings
- Enhanced error handling
- Graceful fallback to mock implementation
- Health status reporting
"""

import logging
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Vector Search client
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_generate_embedding():
    """Test the generate_embedding method"""
    logger.info("Testing generate_embedding method...")

    # Initialize the client
    client = VectorSearchClient()

    # Test with valid input
    text = "This is a test query for embedding generation"
    embedding = client.generate_embedding(text)

    # Check if embedding was generated
    if embedding and len(embedding) > 0:
        logger.info(
            f"✅ Successfully generated embedding with {len(embedding)} dimensions"
        )

        # Check if all values are float
        if all(isinstance(value, float) for value in embedding):
            logger.info("✅ All embedding values are float type")
        else:
            logger.error("❌ Some embedding values are not float type")
    else:
        logger.error("❌ Failed to generate embedding")

    # Test with invalid input
    try:
        invalid_embedding = client.generate_embedding(None)
        logger.info(
            f"✅ Handled None input gracefully: {len(invalid_embedding) if invalid_embedding else 'empty'}"
        )
    except Exception as e:
        logger.error(f"❌ Failed to handle None input: {str(e)}")

    return embedding


def test_search_with_embedding(embedding: list[float]):
    """Test searching with an embedding"""
    logger.info("Testing search with embedding...")

    # Initialize the client
    client = VectorSearchClient()

    # Test with valid embedding
    try:
        # Create a simple test query
        query = "This is a test query for vector search"

        # Get available methods
        methods = [method for method in dir(client) if not method.startswith("_")]
        logger.info(f"Available methods: {methods}")

        # Try to use is_available method
        if "is_available" in methods:
            available = client.is_available()
            logger.info(f"Vector Search available: {available}")

        # Try to search directly with the embedding
        if "search_vector_store" in methods:
            logger.info("Testing search_vector_store method...")
            results = client.search_vector_store(embedding, 3)

            # Check if results were returned
            if results:
                logger.info(
                    f"✅ Successfully retrieved {len(results)} results using search_vector_store"
                )

                # Check result structure
                for i, result in enumerate(results):
                    if all(key in result for key in ["content", "score", "metadata"]):
                        logger.info(f"✅ Result {i+1} has correct structure")
                    else:
                        logger.error(f"❌ Result {i+1} is missing required fields")

                return results
            else:
                logger.info(
                    "No results returned (this might be expected in test environment)"
                )
                return []
        else:
            logger.warning("search_vector_store method not available")

            # Try to use a different search method
            if "search" in methods:
                logger.info("Testing search method...")
                results = client.search(query, 3)
                logger.info(
                    f"✅ Successfully retrieved {len(results)} results using search"
                )
                return results
            else:
                logger.warning("search method not available")
                return []
    except Exception as e:
        logger.error(f"❌ Error during search test: {str(e)}")
        return []


def test_search_knowledge():
    """Test the search_knowledge method"""
    logger.info("Testing search_knowledge method...")

    # Initialize the client
    client = VectorSearchClient()

    # Get available methods
    methods = [method for method in dir(client) if not method.startswith("_")]

    # Check if search_knowledge method is available
    if "search_knowledge" in methods:
        # Test with valid query
        query = "What is Vector Search?"
        try:
            results = client.search_knowledge(query, 3)

            # Check if results were returned
            if results:
                logger.info(
                    f"✅ Successfully retrieved {len(results)} knowledge results"
                )

                # Check result structure
                for i, result in enumerate(results):
                    if all(
                        key in result
                        for key in ["content", "score", "source", "id", "metadata"]
                    ):
                        logger.info(f"✅ Knowledge result {i+1} has correct structure")
                    else:
                        logger.error(
                            f"❌ Knowledge result {i+1} is missing required fields"
                        )
            else:
                logger.info(
                    "No knowledge results returned (this might be expected in test environment)"
                )

            # Test with invalid query
            try:
                invalid_results = client.search_knowledge(None)
                logger.info(
                    f"✅ Handled None query gracefully: {len(invalid_results) if invalid_results else 'empty'}"
                )
            except Exception as e:
                logger.error(f"❌ Failed to handle None query: {str(e)}")

            return results
        except Exception as e:
            logger.error(f"❌ Error during knowledge search: {str(e)}")
            return []
    else:
        logger.warning("search_knowledge method not available")

        # Try to use a different search method
        if "search" in methods:
            logger.info("Falling back to search method...")
            query = "What is Vector Search?"
            try:
                results = client.search(query, 3)
                logger.info(
                    f"✅ Successfully retrieved {len(results)} results using search"
                )
                return results
            except Exception as e:
                logger.error(f"❌ Error during search: {str(e)}")
                return []
        else:
            logger.warning("No suitable search method available")
            return []


def test_health_status():
    """Test the get_health_status method"""
    logger.info("Testing get_health_status method...")

    # Initialize the client
    client = VectorSearchClient()

    # Get health status
    health = client.get_health_status()

    # Check if health status was returned
    if health:
        logger.info(f"✅ Successfully retrieved health status: {health['status']}")

        # Check health status structure
        if all(key in health for key in ["status", "message", "details"]):
            logger.info("✅ Health status has correct structure")
        else:
            logger.error("❌ Health status is missing required fields")

        # Print health details
        logger.info(f"Health message: {health['message']}")
        logger.info(f"Health details: {health['details']}")
    else:
        logger.error("❌ Failed to retrieve health status")

    return health


def main():
    """Main test function"""
    logger.info("Starting Vector Search client tests...")

    # Test generate_embedding
    embedding = test_generate_embedding()
    print()

    # Test search with embedding
    search_results = test_search_with_embedding(embedding)
    print()

    # Test search_knowledge
    knowledge_results = test_search_knowledge()
    print()

    # Test health status
    health_status = test_health_status()
    print()

    # Print summary
    logger.info("Vector Search client tests completed")
    logger.info("Summary:")
    logger.info(f"- Embedding generation: {'✅ Success' if embedding else '❌ Failed'}")
    logger.info(
        f"- Search with embedding: {'✅ Success' if search_results else '❌ Failed'}"
    )
    logger.info(
        f"- Knowledge search: {'✅ Success' if knowledge_results else '❌ Failed'}"
    )
    logger.info(f"- Health status: {'✅ Success' if health_status else '❌ Failed'}")


if __name__ == "__main__":
    main()

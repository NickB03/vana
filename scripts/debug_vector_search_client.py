#!/usr/bin/env python3
"""
Debug Vector Search Client

This script debugs the Vector Search client to identify the source of the error.
"""

import json
import logging
import os
import sys
import traceback

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Use DEBUG level for more detailed logging
    format="%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def main():
    """Main function to debug Vector Search client."""
    # Explicitly set the environment variable for the service account key file
    credentials_path = "/Users/nick/Development/vana/secrets/vana-vector-search-sa.json"
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

    # Print environment variables for debugging
    logger.info(f"GOOGLE_CLOUD_PROJECT: {os.environ.get('GOOGLE_CLOUD_PROJECT')}")
    logger.info(f"GOOGLE_CLOUD_LOCATION: {os.environ.get('GOOGLE_CLOUD_LOCATION')}")
    logger.info(
        f"VECTOR_SEARCH_ENDPOINT_ID: {os.environ.get('VECTOR_SEARCH_ENDPOINT_ID')}"
    )
    logger.info(
        f"DEPLOYED_INDEX_ID: {os.environ.get('DEPLOYED_INDEX_ID', 'vanasharedindex')}"
    )
    logger.info(
        f"GOOGLE_APPLICATION_CREDENTIALS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}"
    )

    # Check if the service account key file exists
    if os.path.exists(credentials_path):
        logger.info(f"Service account key file exists: {credentials_path}")

        # Check the service account email in the key file
        try:
            with open(credentials_path) as f:
                key_data = json.load(f)
                logger.info(f"Service account email: {key_data.get('client_email')}")
        except Exception as e:
            logger.error(f"Error reading service account key file: {e}")
    else:
        logger.error(f"Service account key file does not exist: {credentials_path}")
        return 1

    # Import the Vector Search client
    try:
        from tools.vector_search.vector_search_client import VectorSearchClient

        # Create Vector Search client
        logger.info("Creating Vector Search client...")
        client = VectorSearchClient()

        # Debug the initialization
        logger.debug(f"Client project: {client.project}")
        logger.debug(f"Client location: {client.location}")
        logger.debug(f"Client endpoint_id: {client.endpoint_id}")
        logger.debug(f"Client deployed_index_id: {client.deployed_index_id}")
        logger.debug(f"Client index_endpoint: {client.index_endpoint}")

        # Try to check if Vector Search is available
        logger.info("Checking if Vector Search is available...")
        try:
            is_available = client.is_available()
            logger.info(f"Vector Search available: {is_available}")
        except Exception as e:
            logger.error(f"Error checking if Vector Search is available: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

        # Try to generate an embedding
        logger.info("Generating embedding...")
        try:
            embedding = client.generate_embedding("test")
            logger.info(f"Embedding generated: {len(embedding)} dimensions")
            logger.debug(f"Embedding: {embedding[:5]}...")
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

        # Try to search
        logger.info("Searching...")
        try:
            results = client.search("test", top_k=3)
            logger.info(f"Search results: {len(results)} results")
            for i, result in enumerate(results, 1):
                logger.info(f"  {i}. Score: {result.get('score', 0):.4f}")
                logger.info(f"     Content: {result.get('content', '')[:100]}...")
        except Exception as e:
            logger.error(f"Error searching: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")

        return 0
    except Exception as e:
        logger.error(f"Error importing or using Vector Search client: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

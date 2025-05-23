#!/usr/bin/env python3
"""
Verify Vector Search Client

This script tests the Vector Search client to verify that it can connect to
the real Vector Search service and perform searches.
"""

import os
import sys
import logging
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the Vector Search client
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main function to verify Vector Search client."""
    # Load environment variables
    load_dotenv()

    # Explicitly set the environment variable for the service account key file
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/Users/nick/Development/vana/secrets/vana-vector-search-sa.json"

    # Print environment variables for debugging
    logger.info(f"GOOGLE_CLOUD_PROJECT: {os.environ.get('GOOGLE_CLOUD_PROJECT')}")
    logger.info(f"GOOGLE_CLOUD_LOCATION: {os.environ.get('GOOGLE_CLOUD_LOCATION')}")
    logger.info(f"VECTOR_SEARCH_ENDPOINT_ID: {os.environ.get('VECTOR_SEARCH_ENDPOINT_ID')}")
    logger.info(f"DEPLOYED_INDEX_ID: {os.environ.get('DEPLOYED_INDEX_ID', 'vanasharedindex')}")
    logger.info(f"GOOGLE_APPLICATION_CREDENTIALS: {os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')}")

    # Check if the service account key file exists
    credentials_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if credentials_path and os.path.exists(credentials_path):
        logger.info(f"Service account key file exists: {credentials_path}")

        # Check the service account email in the key file
        try:
            import json
            with open(credentials_path, 'r') as f:
                key_data = json.load(f)
                logger.info(f"Service account email: {key_data.get('client_email')}")
        except Exception as e:
            logger.error(f"Error reading service account key file: {e}")
    else:
        logger.error(f"Service account key file does not exist: {credentials_path}")

    # Create Vector Search client
    logger.info("Creating Vector Search client...")
    client = VectorSearchClient()

    # Check if Vector Search is available
    logger.info("Checking if Vector Search is available...")
    is_available = client.is_available()
    logger.info(f"Vector Search available: {is_available}")

    if is_available:
        logger.info("✅ Vector Search is available!")

        # Test search
        logger.info("Testing search...")
        query = "machine learning"
        results = client.search(query, top_k=3)

        if results:
            logger.info(f"Search results for '{query}':")
            for i, result in enumerate(results, 1):
                logger.info(f"  {i}. Score: {result['score']:.4f}")
                logger.info(f"     Content: {result['content'][:100]}...")
        else:
            logger.warning("No search results found")
    else:
        logger.error("❌ Vector Search is not available")
        logger.info("Checking if mock implementation is being used...")

        # Test search with mock
        query = "machine learning"
        results = client.search(query, top_k=3)

        if results:
            logger.info(f"Mock search results for '{query}':")
            for i, result in enumerate(results, 1):
                logger.info(f"  {i}. Score: {result.get('score', 0):.4f}")
                logger.info(f"     Content: {result.get('content', '')[:100]}...")
            logger.info("✅ Mock Vector Search is working")
        else:
            logger.error("❌ Mock Vector Search is not working")

    return 0 if is_available else 1

if __name__ == "__main__":
    sys.exit(main())

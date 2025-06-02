#!/usr/bin/env python3
"""
Verify Vector Search Index for VANA

This script verifies that the Vector Search index is properly configured and accessible.
It checks the index and endpoint status, and performs a test search to ensure everything
is working correctly.

Usage:
    python scripts/verify_vector_search.py
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Import required modules
try:
    from google.cloud import aiplatform
except ImportError:
    print("Error: google-cloud-aiplatform package not installed.")
    print("Install it with: pip install google-cloud-aiplatform")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_environment_variables() -> dict[str, str]:
    """Load environment variables required for Vector Search."""
    # Load environment variables from .env file
    load_dotenv()

    env_vars = {
        "GOOGLE_CLOUD_PROJECT": os.environ.get("GOOGLE_CLOUD_PROJECT"),
        "GOOGLE_CLOUD_LOCATION": os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
        "VECTOR_SEARCH_INDEX_ID": os.environ.get("VECTOR_SEARCH_INDEX_ID"),
        "VECTOR_SEARCH_ENDPOINT_ID": os.environ.get("VECTOR_SEARCH_ENDPOINT_ID"),
        "DEPLOYED_INDEX_ID": os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex"),
    }

    # Check for missing variables
    missing_vars = [var for var, value in env_vars.items() if not value]
    if missing_vars:
        logger.error(f"Missing environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these variables in your .env file or environment.")

    return env_vars


def verify_index(env_vars: dict[str, str]) -> bool:
    """Verify that the Vector Search index exists and is accessible."""
    try:
        # Initialize Vertex AI
        aiplatform.init(
            project=env_vars["GOOGLE_CLOUD_PROJECT"],
            location=env_vars["GOOGLE_CLOUD_LOCATION"],
        )

        # Get the index
        index = aiplatform.MatchingEngineIndex(
            index_name=env_vars["VECTOR_SEARCH_INDEX_ID"]
        )

        # Print index information
        logger.info(f"✅ Vector Search Index: {index.display_name}")
        logger.info(f"  ID: {index.name}")
        logger.info(f"  Dimensions: {index.dimensions}")
        logger.info(f"  Deployed: {len(index.deployed_indexes) > 0}")

        return True
    except Exception as e:
        logger.error(f"❌ Error accessing Vector Search index: {e}")
        return False


def verify_endpoint(env_vars: dict[str, str]) -> bool:
    """Verify that the Vector Search endpoint exists and is accessible."""
    try:
        # Initialize Vertex AI
        aiplatform.init(
            project=env_vars["GOOGLE_CLOUD_PROJECT"],
            location=env_vars["GOOGLE_CLOUD_LOCATION"],
        )

        # Get the endpoint
        endpoint = aiplatform.MatchingEngineIndexEndpoint(
            index_endpoint_name=env_vars["VECTOR_SEARCH_ENDPOINT_ID"]
        )

        # Print endpoint information
        logger.info(f"✅ Vector Search Endpoint: {endpoint.display_name}")
        logger.info(f"  ID: {endpoint.name}")
        logger.info(f"  Deployed indexes: {len(endpoint.deployed_indexes)}")

        # Check deployed indexes
        deployed_index_found = False
        for deployed_index in endpoint.deployed_indexes:
            logger.info(f"  - Deployed index: {deployed_index.deployed_index_id}")
            logger.info(f"    Index: {deployed_index.index}")

            if deployed_index.deployed_index_id == env_vars["DEPLOYED_INDEX_ID"]:
                deployed_index_found = True

        if not deployed_index_found:
            logger.warning(
                f"⚠️ Deployed index ID '{env_vars['DEPLOYED_INDEX_ID']}' not found on endpoint."
            )

        return True
    except Exception as e:
        logger.error(f"❌ Error accessing Vector Search endpoint: {e}")
        return False


def test_search(env_vars: dict[str, str], query: str = "VANA", top_k: int = 3) -> bool:
    """Perform a test search to verify that Vector Search is working correctly."""
    try:
        # Import vector search client
        from tools.vector_search.vector_search_client import VectorSearchClient

        # Initialize vector search client
        vector_search = VectorSearchClient()

        # Check if vector search is available
        if not vector_search.is_available():
            logger.error("❌ Vector Search client is not available.")
            return False

        # Perform search
        logger.info(f"Performing test search with query: '{query}'")
        results = vector_search.search(query, top_k=top_k)

        # Check results
        if not results:
            logger.warning(f"⚠️ No results found for query: '{query}'")
            return False

        # Print results
        logger.info(f"✅ Found {len(results)} results for query: '{query}'")
        for i, result in enumerate(results):
            content = result.get("content", "")
            score = result.get("score", 0.0)
            logger.info(f"  {i+1}. Score: {score:.4f}, Content: {content[:100]}...")

        return True
    except Exception as e:
        logger.error(f"❌ Error performing test search: {e}")
        return False


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Verify Vector Search Index for VANA")
    parser.add_argument(
        "--query", type=str, default="VANA", help="Test query to use for verification"
    )
    parser.add_argument(
        "--top-k", type=int, default=3, help="Number of results to retrieve"
    )
    args = parser.parse_args()

    # Load environment variables
    env_vars = load_environment_variables()
    if not all(env_vars.values()):
        sys.exit(1)

    # Verify index
    logger.info("Verifying Vector Search index...")
    index_ok = verify_index(env_vars)

    # Verify endpoint
    logger.info("Verifying Vector Search endpoint...")
    endpoint_ok = verify_endpoint(env_vars)

    # Test search
    logger.info("Testing Vector Search...")
    search_ok = test_search(env_vars, query=args.query, top_k=args.top_k)

    # Print summary
    logger.info("Vector Search Verification Summary:")
    logger.info(f"  Index: {'✅ OK' if index_ok else '❌ Failed'}")
    logger.info(f"  Endpoint: {'✅ OK' if endpoint_ok else '❌ Failed'}")
    logger.info(f"  Search: {'✅ OK' if search_ok else '❌ Failed'}")

    # Return success status
    if index_ok and endpoint_ok and search_ok:
        logger.info("✅ Vector Search verification successful!")
        return 0
    else:
        logger.error("❌ Vector Search verification failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())

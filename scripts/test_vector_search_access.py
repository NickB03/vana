#!/usr/bin/env python3
"""
Test Vector Search Access

This script tests direct access to the Vector Search endpoint to verify
that the service account has the necessary permissions.
"""

import logging
import os
import sys

from dotenv import load_dotenv
from google.cloud import aiplatform

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def main():
    """Main function to test Vector Search access."""
    # Load environment variables
    load_dotenv()

    # Get required environment variables
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION")
    endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
    deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")

    if not all([project, location, endpoint_id]):
        logger.error("Missing required environment variables")
        logger.error(
            "Required: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, VECTOR_SEARCH_ENDPOINT_ID"
        )
        return 1

    logger.info("Testing Vector Search access with:")
    logger.info(f"  Project: {project}")
    logger.info(f"  Location: {location}")
    logger.info(f"  Endpoint ID: {endpoint_id}")
    logger.info(f"  Deployed Index ID: {deployed_index_id}")

    try:
        # Initialize Vertex AI
        logger.info("Initializing Vertex AI...")
        aiplatform.init(project=project, location=location)

        # Try to get the index endpoint
        logger.info(f"Attempting to access index endpoint: {endpoint_id}")
        index_endpoint = aiplatform.MatchingEngineIndexEndpoint(
            index_endpoint_name=endpoint_id
        )

        logger.info(
            f"Successfully accessed index endpoint: {index_endpoint.display_name}"
        )

        # Try to list deployed indexes
        logger.info("Listing deployed indexes...")
        deployed_indexes = index_endpoint.list_deployed_indexes()

        if deployed_indexes:
            logger.info(f"Found {len(deployed_indexes)} deployed indexes:")
            for idx, deployed_index in enumerate(deployed_indexes, 1):
                logger.info(f"  {idx}. ID: {deployed_index.deployed_index_id}")
                logger.info(f"     Index: {deployed_index.index}")
        else:
            logger.warning("No deployed indexes found")

        # Try a simple search with a test embedding
        logger.info(f"Testing search with deployed index: {deployed_index_id}")
        test_embedding = [0.1] * 768  # Simple test embedding

        response = index_endpoint.match(
            deployed_index_id=deployed_index_id,
            queries=[{"datapoint": test_embedding}],
            num_neighbors=1,
        )

        if response and len(response) > 0:
            logger.info("Search successful!")
            logger.info(f"Found {len(response[0])} matches")
        else:
            logger.warning("Search returned no results")

        logger.info("✅ All Vector Search access tests passed successfully!")
        return 0

    except Exception as e:
        logger.error(f"❌ Error testing Vector Search access: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

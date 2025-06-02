#!/usr/bin/env python3
"""
Test Match Method with Float32

This script tests the match method of the MatchingEngineIndexEndpoint class
using numpy float32 arrays.
"""

import logging
import os
import sys

import numpy as np
from dotenv import load_dotenv
from google.cloud import aiplatform

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def main():
    """Main function to test the match method with float32."""
    # Load environment variables
    load_dotenv()

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

    # Initialize Vertex AI
    project = os.environ.get("GOOGLE_CLOUD_PROJECT")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION")
    endpoint_id = os.environ.get("VECTOR_SEARCH_ENDPOINT_ID")
    deployed_index_id = os.environ.get("DEPLOYED_INDEX_ID", "vanasharedindex")

    logger.info(f"Initializing Vertex AI with project={project}, location={location}")
    aiplatform.init(project=project, location=location)

    # Use the correct endpoint ID
    endpoint_id = (
        "projects/960076421399/locations/us-central1/indexEndpoints/5085685481161621504"
    )
    logger.info(f"Getting index endpoint: {endpoint_id}")
    index_endpoint = aiplatform.MatchingEngineIndexEndpoint(endpoint_id)

    # Create a test vector using numpy float32
    logger.info("Creating test vector with numpy float32")
    test_vector = np.zeros(768, dtype=np.float32).tolist()
    logger.info(f"Test vector type: {type(test_vector)}")
    logger.info(f"Test vector element type: {type(test_vector[0])}")

    # Test the match method
    logger.info(f"Testing match method with deployed_index_id={deployed_index_id}")
    try:
        response = index_endpoint.match(
            deployed_index_id=deployed_index_id,
            queries=[{"datapoint": test_vector}],
            num_neighbors=1,
        )
        logger.info(f"Match response: {response}")
        return 0
    except Exception as e:
        logger.error(f"Error testing match method: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())

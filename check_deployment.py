#!/usr/bin/env python3
"""
Check if the Vector Search index has been deployed to an endpoint.
"""

import os
from dotenv import load_dotenv
from google.cloud import aiplatform

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

def main():
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # List all available indexes
    print("Listing all available indexes...")
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )

    if not indexes:
        print(f"Index '{INDEX_NAME}' not found.")
        return

    index = indexes[0]
    print(f"Found index: {index.display_name} (ID: {index.name})")

    # Check if the index has been deployed
    deployed_indexes = index.deployed_indexes

    if deployed_indexes:
        print(f"Index is deployed to {len(deployed_indexes)} endpoints:")
        for i, deployed_index in enumerate(deployed_indexes):
            print(f"  {i+1}. Deployed index ID: {deployed_index}")

            # Get more information about the endpoint if possible
            try:
                if hasattr(deployed_index, 'index_endpoint'):
                    print(f"     Endpoint: {deployed_index.index_endpoint.resource_name}")
                elif isinstance(deployed_index, dict) and 'index_endpoint' in deployed_index:
                    print(f"     Endpoint: {deployed_index['index_endpoint']}")
            except Exception as e:
                print(f"     Could not get endpoint details: {str(e)}")
    else:
        print("Index has not been deployed to any endpoints.")

        # List all available endpoints
        print("\nListing all available endpoints...")
        endpoints = aiplatform.MatchingEngineIndexEndpoint.list()

        if endpoints:
            print(f"Found {len(endpoints)} endpoints:")
            for i, endpoint in enumerate(endpoints):
                print(f"  {i+1}. {endpoint.display_name} (ID: {endpoint.name})")
        else:
            print("No endpoints found. You need to create an endpoint first.")

if __name__ == "__main__":
    main()

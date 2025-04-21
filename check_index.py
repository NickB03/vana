#!/usr/bin/env python3
"""
Check the status of the Vector Search index.
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
    indexes = aiplatform.MatchingEngineIndex.list()
    
    if not indexes:
        print("No indexes found.")
        return
    
    print(f"Found {len(indexes)} indexes:")
    for i, idx in enumerate(indexes):
        print(f"  {i+1}. {idx.display_name} (ID: {idx.name})")
        print(f"     - Description: {idx.description}")
        print(f"     - Create time: {idx.create_time}")
        print(f"     - Update time: {idx.update_time}")
        print(f"     - Labels: {idx.labels}")

if __name__ == "__main__":
    main()

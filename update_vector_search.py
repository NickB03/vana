#!/usr/bin/env python3
"""
Update a Vector Search index with embeddings from a GCS URI.
This script uses the Vertex AI SDK to update the index with embeddings.
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

    # Create the GCS URI for the embeddings
    gcs_uri = f"gs://{PROJECT_ID}-vector-search/embeddings.jsonl"

    # List all available indexes
    print("Listing all available indexes...")
    indexes = aiplatform.MatchingEngineIndex.list()

    if not indexes:
        print("No indexes found. Please create an index first.")
        return

    print(f"Found {len(indexes)} indexes:")
    for i, idx in enumerate(indexes):
        print(f"  {i+1}. {idx.display_name} (ID: {idx.name})")

    # Find the index with the matching display name
    target_index = None
    for idx in indexes:
        if idx.display_name == INDEX_NAME:
            target_index = idx
            break

    if not target_index:
        print(f"Index with display name '{INDEX_NAME}' not found.")
        print("Please choose an index from the list above.")
        return

    print(f"\nUpdating index {target_index.display_name} with embeddings from {gcs_uri}...")

    # Update the embeddings
    try:
        target_index.update_embeddings(
            contents_delta_uri=gcs_uri,
            is_complete_overwrite=False
        )

        print("Update request submitted successfully!")
        print("The update process may take some time to complete.")
        print("You will receive an email notification when the update is complete.")
    except Exception as e:
        print(f"Error updating index: {str(e)}")
        print("\nTrying alternative method...")

        try:
            # Try using the update method instead
            target_index.update_metadata(
                display_name=target_index.display_name,
                description="VANA shared knowledge index"
            )

            print("Metadata update successful!")
            print("Now updating embeddings...")

            # Use the REST API to update the embeddings
            from google.oauth2 import service_account
            import google.auth.transport.requests
            import requests

            # Get an access token
            credentials = service_account.Credentials.from_service_account_file(
                os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )

            auth_req = google.auth.transport.requests.Request()
            credentials.refresh(auth_req)
            access_token = credentials.token

            # Extract the index ID from the resource name
            index_id = target_index.name.split("/")[-1]

            # Update the index using the REST API
            url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}"
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }

            data = {
                "contents_delta_uri": gcs_uri,
                "is_complete_overwrite": False
            }

            print(f"Sending request to update index: {url}")
            response = requests.patch(url, headers=headers, json=data)

            if response.status_code in [200, 201, 202]:
                print("Update started successfully!")
                print(response.json())
            else:
                print(f"Error updating index: {response.status_code} {response.text}")
        except Exception as e2:
            print(f"Error with alternative method: {str(e2)}")

if __name__ == "__main__":
    main()

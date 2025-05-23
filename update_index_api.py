#!/usr/bin/env python3
"""
Update the Vector Search index with embeddings using the REST API.
"""

import os
import requests
from dotenv import load_dotenv
from google.oauth2 import service_account
import google.auth.transport.requests

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_ID = "4167591072945405952"  # From the check_index.py output

def main():
    # Get an access token
    credentials = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )

    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    access_token = credentials.token

    # Create the GCS URI for the embeddings directory
    gcs_uri = f"gs://{PROJECT_ID}-vector-search/embeddings_data"

    # Update the index using the REST API
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{INDEX_ID}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    data = {
        "metadata": {
            "contents_delta_uri": gcs_uri,
            "is_complete_overwrite": False
        }
    }

    print(f"Sending request to update index: {url}")
    print(f"With data: {data}")

    response = requests.patch(url, headers=headers, json=data)

    if response.status_code in [200, 201, 202]:
        print("Update started successfully!")
        print(response.json())
    else:
        print(f"Error updating index: {response.status_code} {response.text}")

if __name__ == "__main__":
    main()

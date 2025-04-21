#!/usr/bin/env python3
"""
Search the Vector Search index for similar documents.
This script demonstrates how to use the Vector Search API to find documents
similar to a given query.
"""

import os
import requests
import json
from dotenv import load_dotenv
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.oauth2 import service_account
import google.auth.transport.requests

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_ID = "4167591072945405952"  # From the check_index.py output
ENDPOINT_ID = "vanasharedindex"   # From the check_deployment.py output

def generate_embedding(text):
    """Generate an embedding for a text using Vertex AI."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # Use the text-embedding-004 model
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")

    print(f"Generating embedding for query...")
    embedding = model.get_embeddings([text])[0]

    return embedding.values

def get_access_token():
    """Get an access token for the Google Cloud API."""
    credentials = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )

    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials.token

def search_vector_index(query_embedding, top_k=5):
    """Search the Vector Search index for similar documents using the REST API."""
    # Get an access token
    access_token = get_access_token()

    # Find the endpoint ID
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexEndpoints"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    print("Finding index endpoints...")
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error finding endpoints: {response.status_code} {response.text}")
        return []

    endpoints = response.json().get("indexEndpoints", [])

    if not endpoints:
        print("No index endpoints found.")
        return []

    # Use the first endpoint
    endpoint = endpoints[0]
    endpoint_id = endpoint["name"].split("/")[-1]
    print(f"Using endpoint: {endpoint_id}")

    # Search the index
    search_url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexEndpoints/{endpoint_id}:findNeighbors"

    data = {
        "deployedIndexId": ENDPOINT_ID,
        "queries": [
            {
                "datapoint": {
                    "featureVector": query_embedding
                },
                "neighborCount": top_k
            }
        ]
    }

    print(f"Searching index with query...")
    search_response = requests.post(search_url, headers=headers, json=data)

    if search_response.status_code != 200:
        print(f"Error searching index: {search_response.status_code} {search_response.text}")
        return []

    # Parse the results
    results = search_response.json()

    # Extract the neighbors from the first query result
    if "nearestNeighbors" in results and len(results["nearestNeighbors"]) > 0:
        neighbors = results["nearestNeighbors"][0].get("neighbors", [])
        return neighbors

    return []

def main():
    # Get a query from the user
    query = input("Enter your search query: ")

    # Generate embedding for the query
    query_embedding = generate_embedding(query)

    # Search the index
    results = search_vector_index(query_embedding)

    # Display the results
    if results:
        print(f"\nFound {len(results)} results:")
        for i, result in enumerate(results):
            print(f"\nResult {i+1}:")

            # Extract datapoint information
            if "datapoint" in result:
                datapoint = result["datapoint"]
                print(f"  ID: {datapoint.get('datapointId', 'N/A')}")

                # Extract distance
                print(f"  Distance: {result.get('distance', 'N/A')}")

                # Try to extract metadata if available
                if "metadata" in datapoint:
                    metadata = datapoint["metadata"]
                    print(f"  Metadata:")
                    for key, value in metadata.items():
                        if key == "text":
                            # Truncate long text
                            text = value[:200] + "..." if len(value) > 200 else value
                            print(f"    {key}: {text}")
                        else:
                            print(f"    {key}: {value}")

                # Try to extract string metadata if available
                if "stringMetadata" in datapoint:
                    string_metadata = datapoint["stringMetadata"]
                    print(f"  String Metadata:")
                    for item in string_metadata:
                        key = item.get("name")
                        value = item.get("value")
                        if key == "text":
                            # Truncate long text
                            text = value[:200] + "..." if len(value) > 200 else value
                            print(f"    {key}: {text}")
                        else:
                            print(f"    {key}: {value}")
    else:
        print("No results found.")

if __name__ == "__main__":
    main()

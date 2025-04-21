#!/usr/bin/env python3
"""
Update a Vector Search index using batch updates via the REST API.
This script follows the official Google Cloud documentation.
"""

import os
import glob
import json
import tempfile
import requests
from dotenv import load_dotenv
from google.cloud import storage
import vertexai
from vertexai.language_models import TextEmbeddingModel
from google.oauth2 import service_account
import google.auth.transport.requests

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def read_document(file_path):
    """Read a document file and return its content."""
    with open(file_path, "r") as f:
        return f.read()

def generate_embeddings(texts):
    """Generate embeddings for a list of texts using Vertex AI."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)

    # Use the text-embedding-004 model as recommended in the documentation
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")

    print(f"Generating embeddings for {len(texts)} texts...")
    embeddings = model.get_embeddings(texts)

    return [embedding.values for embedding in embeddings]

def get_access_token():
    """Get an access token for the Google Cloud API."""
    credentials = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )

    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials.token

def create_embeddings_jsonl(documents, file_paths):
    """Create a JSONL file with embeddings for batch upload."""
    # Generate embeddings for all documents
    embeddings = generate_embeddings(documents)

    # Create a temporary JSONL file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        temp_file = f.name

        # Write each datapoint as a separate JSON line
        for i, (embedding, file_path, document) in enumerate(zip(embeddings, file_paths, documents)):
            # Create the datapoint
            datapoint = {
                "id": f"doc_{i}_{os.path.basename(file_path)}",
                "embedding": embedding,
                "metadata": {
                    "source": file_path,
                    "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
                    "text": document
                }
            }

            # Write as a JSON line
            f.write(json.dumps(datapoint) + "\n")
            print(f"Prepared datapoint {i+1}/{len(embeddings)}")

    print(f"Created embeddings file: {temp_file}")
    return temp_file

def upload_file_to_gcs(file_path):
    """Upload a file to Google Cloud Storage."""
    bucket_name = f"{PROJECT_ID}-vector-search"
    blob_name = "embeddings.jsonl"

    storage_client = storage.Client()

    # Get or create the bucket
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"Using existing bucket: {bucket_name}")
    except Exception:
        print(f"Creating bucket: {bucket_name}")
        bucket = storage_client.create_bucket(bucket_name, location=LOCATION)

    # Upload the file
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(file_path)

    gcs_uri = f"gs://{bucket_name}/{blob_name}"
    print(f"Uploaded embeddings to: {gcs_uri}")
    return gcs_uri

def get_index_id():
    """Get the ID of the Vector Search index."""
    access_token = get_access_token()

    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"Error getting indexes: {response.text}")
        return None

    indexes = response.json().get("indexes", [])

    for index in indexes:
        if index.get("displayName") == INDEX_NAME:
            index_id = index.get("name").split("/")[-1]
            print(f"Found index ID: {index_id}")
            return index_id

    print(f"Index '{INDEX_NAME}' not found")
    return None

def update_index_with_embeddings(index_id, gcs_uri):
    """Update the Vector Search index with embeddings from GCS using the REST API."""
    access_token = get_access_token()

    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Use the correct field names according to the latest API
    data = {
        "contents_delta_uri": gcs_uri,
        "is_complete_overwrite": False
    }

    print(f"Sending request to update index: {url}")
    response = requests.patch(url, headers=headers, json=data)

    if response.status_code in [200, 201, 202]:
        print("Update started successfully!")
        print(response.json())
        return True
    else:
        print(f"Error updating index: {response.status_code} {response.text}")
        return False

def main():
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")

    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return

    print(f"Found {len(doc_files)} document files")

    # Read all documents
    documents = []
    for file_path in doc_files:
        document = read_document(file_path)
        documents.append(document)

    # Create embeddings file
    embeddings_file = create_embeddings_jsonl(documents, doc_files)

    # Upload embeddings file to GCS
    gcs_uri = upload_file_to_gcs(embeddings_file)

    # Clean up the temporary file
    os.unlink(embeddings_file)

    # Get the index ID
    index_id = get_index_id()

    if not index_id:
        return

    # Update the index
    update_index_with_embeddings(index_id, gcs_uri)

if __name__ == "__main__":
    main()

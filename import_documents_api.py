#!/usr/bin/env python3
"""
Import documents to Vector Search using the Vertex AI REST API.
"""

import os
import json
import glob
import tempfile
from dotenv import load_dotenv
from google.cloud import storage
from google.oauth2 import service_account
import google.auth
import google.auth.transport.requests

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
CREDENTIALS_PATH = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def get_access_token():
    """Get an access token for the Google Cloud API."""
    credentials = service_account.Credentials.from_service_account_file(
        CREDENTIALS_PATH,
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    
    credentials.refresh(google.auth.transport.requests.Request())
    return credentials.token

def upload_documents_to_gcs():
    """Upload documents to Google Cloud Storage."""
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")
    
    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return None
    
    print(f"Found {len(doc_files)} document files")
    
    # Read the content of each file
    documents = []
    for file_path in doc_files:
        with open(file_path, "r") as f:
            content = f.read()
            
            # Create document with metadata
            document = {
                "content": content,
                "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
                "uri": file_path
            }
            
            documents.append(document)
    
    # Create a temporary jsonl file with the documents
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        temp_file = f.name
        for doc in documents:
            f.write(json.dumps(doc) + "\n")
    
    print(f"Created temporary file: {temp_file}")
    
    # Upload the file to a GCS bucket
    bucket_name = f"{PROJECT_ID}-vector-search"
    blob_name = "vana-documents.jsonl"
    
    storage_client = storage.Client()
    
    # Get or create the bucket
    try:
        bucket = storage_client.get_bucket(bucket_name)
    except Exception:
        print(f"Creating bucket: {bucket_name}")
        bucket = storage_client.create_bucket(bucket_name, location=LOCATION)
    
    # Upload the file
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(temp_file)
    
    gcs_uri = f"gs://{bucket_name}/{blob_name}"
    print(f"Uploaded documents to: {gcs_uri}")
    
    # Clean up the temporary file
    os.unlink(temp_file)
    
    return gcs_uri

def get_index_id():
    """Get the ID of the Vector Search index."""
    import requests
    
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

def import_documents(gcs_uri, index_id):
    """Import documents to the Vector Search index using the REST API."""
    import requests
    
    access_token = get_access_token()
    
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}:updateDocuments"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "gcsSource": {
            "uris": [gcs_uri]
        }
    }
    
    print(f"Sending request to import documents: {url}")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print("Import started successfully!")
        print(response.json())
        return True
    else:
        print(f"Error importing documents: {response.status_code} {response.text}")
        return False

def main():
    # Upload documents to GCS
    gcs_uri = upload_documents_to_gcs()
    
    if not gcs_uri:
        return
    
    # Get the index ID
    index_id = get_index_id()
    
    if not index_id:
        return
    
    # Import documents to the index
    import_documents(gcs_uri, index_id)

if __name__ == "__main__":
    main()

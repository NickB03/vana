#!/usr/bin/env python3
"""
Upload documents directly to Vertex AI Vector Search.
This script uses the Vertex AI API to upload documents directly,
letting Vertex AI handle all processing, chunking, and embedding generation.
"""

import os
import glob
import json
import requests
from google.oauth2 import service_account
from google.cloud import storage
from dotenv import load_dotenv

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
    
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return credentials.token

def upload_files_to_gcs():
    """Upload all text files to Google Cloud Storage."""
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")
    
    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return None
    
    print(f"Found {len(doc_files)} document files")
    
    # Create a GCS bucket
    bucket_name = f"{PROJECT_ID}-vector-search-docs"
    storage_client = storage.Client()
    
    # Get or create the bucket
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"Using existing bucket: {bucket_name}")
    except Exception:
        print(f"Creating bucket: {bucket_name}")
        bucket = storage_client.create_bucket(bucket_name, location=LOCATION)
    
    # Upload each file to GCS
    gcs_uris = []
    for file_path in doc_files:
        blob_name = os.path.basename(file_path)
        blob = bucket.blob(blob_name)
        
        print(f"Uploading {file_path} to gs://{bucket_name}/{blob_name}")
        blob.upload_from_filename(file_path)
        
        gcs_uris.append(f"gs://{bucket_name}/{blob_name}")
    
    print(f"Uploaded {len(gcs_uris)} files to GCS")
    return gcs_uris

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

def create_corpus(index_id, corpus_name="vana-knowledge"):
    """Create a corpus in the Vector Search index."""
    access_token = get_access_token()
    
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}/corpora"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "displayName": corpus_name,
        "description": "VANA knowledge corpus"
    }
    
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        corpus_id = response.json().get("name").split("/")[-1]
        print(f"Created corpus: {corpus_id}")
        return corpus_id
    else:
        print(f"Error creating corpus: {response.status_code} {response.text}")
        return None

def get_corpus_id(index_id, corpus_name="vana-knowledge"):
    """Get the ID of a corpus in the Vector Search index."""
    access_token = get_access_token()
    
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}/corpora"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code != 200:
        print(f"Error getting corpora: {response.text}")
        return None
    
    corpora = response.json().get("corpora", [])
    
    for corpus in corpora:
        if corpus.get("displayName") == corpus_name:
            corpus_id = corpus.get("name").split("/")[-1]
            print(f"Found corpus ID: {corpus_id}")
            return corpus_id
    
    # If corpus doesn't exist, create it
    print(f"Corpus '{corpus_name}' not found, creating it...")
    return create_corpus(index_id, corpus_name)

def ingest_documents(index_id, corpus_id, gcs_uris):
    """Ingest documents into the Vector Search index."""
    access_token = get_access_token()
    
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}/corpora/{corpus_id}:ingestDocuments"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "gcsDocuments": {
            "gcsUris": gcs_uris
        }
    }
    
    print(f"Ingesting {len(gcs_uris)} documents into corpus {corpus_id}...")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print("Document ingestion started successfully!")
        operation = response.json().get("name")
        print(f"Operation: {operation}")
        return True
    else:
        print(f"Error ingesting documents: {response.status_code} {response.text}")
        return False

def main():
    # Upload files to GCS
    gcs_uris = upload_files_to_gcs()
    
    if not gcs_uris:
        return
    
    # Get the index ID
    index_id = get_index_id()
    
    if not index_id:
        return
    
    # Get or create the corpus
    corpus_id = get_corpus_id(index_id)
    
    if not corpus_id:
        return
    
    # Ingest documents
    ingest_documents(index_id, corpus_id, gcs_uris)

if __name__ == "__main__":
    import google.auth.transport.requests
    main()

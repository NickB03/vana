#!/usr/bin/env python3
"""
Upload embeddings to Vector Search using batch update.
This script generates embeddings using Vertex AI, uploads them to GCS,
and then uses the batch update API to import them into Vector Search.
"""

import os
import glob
import json
import uuid
import tempfile
from dotenv import load_dotenv
from google.cloud import storage
from google.cloud import aiplatform
import vertexai
from vertexai.language_models import TextEmbeddingModel
import requests
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

def get_index_id():
    """Get the ID of the Vector Search index."""
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    
    # Get the Vector Search index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )
    
    if not indexes:
        print(f"Vector Search index '{INDEX_NAME}' not found")
        return None
    
    index = indexes[0]
    index_id = index.resource_name.split("/")[-1]
    print(f"Found index ID: {index_id}")
    return index_id

def create_embeddings_file(documents, file_paths):
    """Create a JSON file with embeddings for batch upload."""
    # Generate embeddings for all documents
    embeddings = generate_embeddings(documents)
    
    # Create a list of datapoints
    datapoints = []
    for i, (embedding, file_path, document) in enumerate(zip(embeddings, file_paths, documents)):
        # Create a unique ID for this datapoint
        datapoint_id = str(uuid.uuid4())
        
        # Create the datapoint
        datapoint = {
            "id": datapoint_id,
            "embedding": embedding,
            "metadata": {
                "source": file_path,
                "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
                "text": document
            }
        }
        
        datapoints.append(datapoint)
        print(f"Prepared datapoint {i+1}/{len(embeddings)}")
    
    # Create a temporary JSON file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        temp_file = f.name
        json.dump(datapoints, f, indent=2)
    
    print(f"Created embeddings file: {temp_file}")
    return temp_file

def upload_file_to_gcs(file_path):
    """Upload a file to Google Cloud Storage."""
    bucket_name = f"{PROJECT_ID}-vector-search"
    blob_name = "embeddings.json"
    
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

def import_embeddings(index_id, gcs_uri):
    """Import embeddings to the Vector Search index using the REST API."""
    access_token = get_access_token()
    
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}:batchUpdate"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "inputConfig": {
            "gcsSource": {
                "uris": [gcs_uri]
            }
        }
    }
    
    print(f"Sending request to import embeddings: {url}")
    response = requests.post(url, headers=headers, json=data)
    
    if response.status_code == 200:
        print("Import started successfully!")
        print(response.json())
        return True
    else:
        print(f"Error importing embeddings: {response.status_code} {response.text}")
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
    embeddings_file = create_embeddings_file(documents, doc_files)
    
    # Upload embeddings file to GCS
    gcs_uri = upload_file_to_gcs(embeddings_file)
    
    # Clean up the temporary file
    os.unlink(embeddings_file)
    
    # Get the index ID
    index_id = get_index_id()
    
    if not index_id:
        return
    
    # Import embeddings to Vector Search
    import_embeddings(index_id, gcs_uri)

if __name__ == "__main__":
    main()

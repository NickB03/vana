#!/usr/bin/env python3
"""
Prepare embeddings for Vector Search in the correct format.
"""

import os
import glob
import json
import uuid
from dotenv import load_dotenv
from google.cloud import storage
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")

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

def main():
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")
    
    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return
    
    print(f"Found {len(doc_files)} document files")
    
    # Create a storage client
    storage_client = storage.Client()
    
    # Get or create the bucket
    bucket_name = f"{PROJECT_ID}-vector-search"
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"Using existing bucket: {bucket_name}")
    except Exception:
        print(f"Creating bucket: {bucket_name}")
        bucket = storage_client.create_bucket(bucket_name, location=LOCATION)
    
    # Create a directory structure for the embeddings
    directory_name = "embeddings_data"
    
    # Process each document
    for i, file_path in enumerate(doc_files):
        print(f"Processing document {i+1}/{len(doc_files)}: {file_path}")
        
        # Read the document
        document = read_document(file_path)
        
        # Generate embedding
        embeddings = generate_embeddings([document])
        
        # Create the embedding record
        embedding_record = {
            "id": str(uuid.uuid4()),
            "embedding": embeddings[0],
            "metadata": {
                "source": file_path,
                "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
                "text": document
            }
        }
        
        # Create a JSON file for this document
        file_name = f"{directory_name}/{os.path.basename(file_path).replace('.txt', '.json')}"
        blob = bucket.blob(file_name)
        
        # Upload the embedding record
        blob.upload_from_string(
            json.dumps(embedding_record),
            content_type="application/json"
        )
        
        print(f"Uploaded embedding for {file_path} to gs://{bucket_name}/{file_name}")
    
    print(f"All embeddings uploaded to gs://{bucket_name}/{directory_name}/")
    print(f"Use this directory path for updating the Vector Search index: gs://{bucket_name}/{directory_name}")

if __name__ == "__main__":
    main()

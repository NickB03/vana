#!/usr/bin/env python3
"""
Update Vector Search index with embeddings.
This script uses the Vertex AI SDK to update the index with embeddings.
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

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

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

def create_embeddings_jsonl(documents, file_paths):
    """Create a JSONL file with embeddings for batch upload."""
    # Generate embeddings for all documents
    embeddings = generate_embeddings(documents)
    
    # Create a temporary JSONL file
    with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
        temp_file = f.name
        
        # Write each datapoint as a separate JSON line
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

def update_index(gcs_uri):
    """Update the Vector Search index with embeddings from GCS."""
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)
    
    # Get the Vector Search index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )
    
    if not indexes:
        print(f"Vector Search index '{INDEX_NAME}' not found")
        return False
    
    index = indexes[0]
    print(f"Using Vector Search index: {index.resource_name}")
    
    # Try different methods to update the index
    try:
        # Try using the update_embeddings method if available
        if hasattr(index, "update_embeddings"):
            print("Using update_embeddings method...")
            response = index.update_embeddings(
                embeddings_uri=gcs_uri,
                embeddings_format="jsonl"
            )
            print("Update started successfully!")
            return True
        
        # Try using the import_embeddings method if available
        elif hasattr(index, "import_embeddings"):
            print("Using import_embeddings method...")
            response = index.import_embeddings(
                embeddings_uri=gcs_uri,
                embeddings_format="jsonl"
            )
            print("Import started successfully!")
            return True
        
        # Try using the batch_import method if available
        elif hasattr(index, "batch_import"):
            print("Using batch_import method...")
            response = index.batch_import(
                gcs_source=gcs_uri,
                format="jsonl"
            )
            print("Batch import started successfully!")
            return True
        
        # If none of the above methods are available, try using the generic update method
        else:
            print("Using generic update method...")
            response = index.update(
                display_name=INDEX_NAME,
                description="VANA shared knowledge index",
                metadata_schema_uri="",
                content_source_uri=gcs_uri
            )
            print("Update started successfully!")
            return True
    
    except Exception as e:
        print(f"Error updating index: {str(e)}")
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
    
    # Update the index
    update_index(gcs_uri)

if __name__ == "__main__":
    main()

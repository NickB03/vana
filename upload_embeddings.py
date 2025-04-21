#!/usr/bin/env python3
"""
Upload documents to Vector Search using Vertex AI.
This script generates embeddings using Vertex AI and uploads them to Vector Search.
"""

import os
import glob
import uuid
from dotenv import load_dotenv
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

def upload_to_vector_search(embeddings, ids):
    """Upload embeddings to Vector Search."""
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
    
    # Prepare datapoints for upload
    datapoints = []
    for i, (embedding, id) in enumerate(zip(embeddings, ids)):
        # Create the datapoint
        datapoint = {
            "datapoint_id": id,
            "feature_vector": embedding
        }
        
        datapoints.append(datapoint)
        print(f"Prepared datapoint {i+1}/{len(embeddings)}")
    
    # Upload datapoints in batches
    batch_size = 10
    for i in range(0, len(datapoints), batch_size):
        batch = datapoints[i:i+batch_size]
        print(f"Uploading batch {i//batch_size + 1}/{(len(datapoints) + batch_size - 1)//batch_size}...")
        
        try:
            index.upsert_datapoints(datapoints=batch)
            print(f"Successfully uploaded batch {i//batch_size + 1}")
        except Exception as e:
            print(f"Error uploading batch: {str(e)}")
            return False
    
    print("All datapoints uploaded successfully!")
    return True

def main():
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")
    
    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return
    
    print(f"Found {len(doc_files)} document files")
    
    # Process each document
    for i, file_path in enumerate(doc_files):
        print(f"Processing document {i+1}/{len(doc_files)}: {file_path}")
        
        # Read the document
        document = read_document(file_path)
        
        # Generate a unique ID for this document
        doc_id = str(uuid.uuid4())
        
        # Process in small batches to avoid memory issues
        try:
            # Generate embedding for the document
            embeddings = generate_embeddings([document])
            
            # Upload to Vector Search
            upload_to_vector_search(embeddings, [doc_id])
            
            print(f"Successfully processed document {i+1}/{len(doc_files)}")
        except Exception as e:
            print(f"Error processing document {file_path}: {str(e)}")

if __name__ == "__main__":
    main()

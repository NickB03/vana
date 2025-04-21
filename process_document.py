#!/usr/bin/env python3
"""
Process a single document and upload it to Vector Search.
"""

import os
import sys
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

def chunk_document(document, chunk_size=1000, overlap=200):
    """Split a document into overlapping chunks."""
    if len(document) <= chunk_size:
        return [document]
    
    chunks = []
    start = 0
    while start < len(document):
        end = min(start + chunk_size, len(document))
        
        # Try to find a paragraph break or newline for a cleaner cut
        if end < len(document):
            # Look for paragraph break
            paragraph_break = document.rfind("\n\n", start, end)
            if paragraph_break != -1 and paragraph_break > start + chunk_size // 2:
                end = paragraph_break + 2
            else:
                # Look for newline
                newline = document.rfind("\n", start, end)
                if newline != -1 and newline > start + chunk_size // 2:
                    end = newline + 1
        
        chunks.append(document[start:end])
        start = end - overlap
    
    return chunks

def generate_embeddings(texts):
    """Generate embeddings for a list of texts using Vertex AI."""
    # Initialize Vertex AI
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    
    # Use the text-embedding-004 model as recommended in the documentation
    model = TextEmbeddingModel.from_pretrained("text-embedding-004")
    
    print(f"Generating embeddings for {len(texts)} texts...")
    embeddings = model.get_embeddings(texts)
    
    return [embedding.values for embedding in embeddings]

def upload_to_vector_search(chunks, metadata_list, embeddings):
    """Upload chunks and their embeddings to Vector Search."""
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
    for i, (chunk, metadata, embedding) in enumerate(zip(chunks, metadata_list, embeddings)):
        # Create a unique ID for this datapoint
        datapoint_id = str(uuid.uuid4())
        
        # Create the datapoint
        datapoint = {
            "datapoint_id": datapoint_id,
            "feature_vector": embedding
        }
        
        datapoints.append(datapoint)
        print(f"Prepared datapoint {i+1}/{len(chunks)}")
    
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

def process_document(file_path):
    """Process a single document and upload it to Vector Search."""
    print(f"Processing document: {file_path}")
    
    # Read the document
    document = read_document(file_path)
    
    # Split into chunks
    chunks = chunk_document(document)
    print(f"Split into {len(chunks)} chunks")
    
    # Create metadata for each chunk
    metadata_list = []
    for j, chunk in enumerate(chunks):
        metadata_list.append({
            "source": file_path,
            "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
            "chunk_index": j,
            "text": chunk
        })
    
    # Process in smaller batches to avoid memory issues
    batch_size = 5
    for i in range(0, len(chunks), batch_size):
        batch_end = min(i + batch_size, len(chunks))
        batch_chunks = chunks[i:batch_end]
        batch_metadata = metadata_list[i:batch_end]
        
        print(f"Processing batch {i//batch_size + 1}/{(len(chunks) + batch_size - 1)//batch_size}: chunks {i+1}-{batch_end}")
        
        # Generate embeddings for this batch
        batch_embeddings = generate_embeddings(batch_chunks)
        
        # Upload this batch to Vector Search
        upload_to_vector_search(batch_chunks, batch_metadata, batch_embeddings)
        
        print(f"Completed batch {i//batch_size + 1}/{(len(chunks) + batch_size - 1)//batch_size}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python process_document.py <document_path>")
        return
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    process_document(file_path)
    print(f"Document {file_path} processed successfully!")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate embeddings for knowledge documents and upload them to Vector Search.
"""

import os
import glob
import uuid
from typing import List, Dict, Any
from dotenv import load_dotenv
from google.cloud import aiplatform

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

# Initialize Vertex AI
aiplatform.init(project=PROJECT_ID, location=LOCATION)

def read_document(file_path: str) -> str:
    """Read a document file and return its content."""
    with open(file_path, "r") as f:
        return f.read()

def chunk_document(document: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
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

def generate_embeddings_batch(texts: List[str]):
    """Generate embeddings for a batch of texts using Vertex AI."""
    # Use text-embedding-004 model for higher quality embeddings
    model_name = "textembedding-gecko@latest"
    model = aiplatform.TextEmbeddingModel.from_pretrained(model_name)

    # Generate embeddings
    print(f"Generating embeddings for {len(texts)} chunks using {model_name}...")
    response = model.get_embeddings(texts)

    # Extract embeddings
    embeddings = []
    for i, embedding in enumerate(response):
        embeddings.append(embedding.values)

    return embeddings

def upload_to_vector_search(chunks: List[str], metadata: List[Dict[str, Any]]):
    """Upload chunks to Vector Search index."""
    # Get the index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )

    if not indexes:
        raise ValueError(f"Vector Search index '{INDEX_NAME}' not found")

    index = indexes[0]

    # Process in smaller batches to avoid memory issues
    batch_size = 5  # Process 5 chunks at a time
    total_chunks = len(chunks)

    for batch_start in range(0, total_chunks, batch_size):
        batch_end = min(batch_start + batch_size, total_chunks)
        batch_chunks = chunks[batch_start:batch_end]
        batch_metadata = metadata[batch_start:batch_end]

        print(f"Processing batch {batch_start//batch_size + 1}/{(total_chunks + batch_size - 1)//batch_size}: chunks {batch_start+1}-{batch_end}")

        # Generate embeddings for this batch
        embeddings = generate_embeddings_batch(batch_chunks)

        # Prepare datapoints for upload
        datapoints = []
        for i, (embedding, meta) in enumerate(zip(embeddings, batch_metadata)):
            datapoint = {
                "id": str(uuid.uuid4()),  # Generate a unique ID
                "embedding": embedding,
                "restricts": [],
                "metadata": meta
            }
            datapoints.append(datapoint)

        # Upload this batch to Vector Search
        print(f"Uploading {len(datapoints)} datapoints to Vector Search index...")
        index.upsert_datapoints(datapoints=datapoints)
        print(f"Batch {batch_start//batch_size + 1} upload complete!")

    print("All uploads complete!")

def process_document(file_path):
    """Process a single document and upload its chunks to Vector Search."""
    print(f"Processing document: {file_path}")

    # Read the document
    document = read_document(file_path)

    # Split into chunks
    chunks = chunk_document(document)
    print(f"  Split into {len(chunks)} chunks")

    # Prepare metadata for each chunk
    doc_chunks = []
    doc_metadata = []

    for j, chunk in enumerate(chunks):
        doc_chunks.append(chunk)
        doc_metadata.append({
            "source": file_path,
            "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
            "chunk_index": j,
            "text": chunk
        })

    # Upload chunks for this document
    if doc_chunks:
        upload_to_vector_search(doc_chunks, doc_metadata)
    else:
        print("  No chunks generated for this document")

def main():
    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")

    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return

    print(f"Found {len(doc_files)} document files")

    # Process each document individually
    for i, file_path in enumerate(doc_files):
        print(f"Document {i+1}/{len(doc_files)}:")
        process_document(file_path)
        print(f"Completed document {i+1}/{len(doc_files)}")

if __name__ == "__main__":
    main()

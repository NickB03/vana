#!/usr/bin/env python3
"""
Process a single document, generate embeddings, and save them to a JSON file.
"""

import os
import sys
import json
import uuid
from dotenv import load_dotenv
import vertexai
from vertexai.language_models import TextEmbeddingModel

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)

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

def generate_embedding(text):
    """Generate an embedding for a single text using Vertex AI."""
    # Use a model that's available to your project
    model_name = "text-embedding-004"
    model = TextEmbeddingModel.from_pretrained(model_name)
    
    # Generate embedding
    print(f"Generating embedding...")
    response = model.get_embeddings([text])
    
    # Extract embedding
    embedding = response[0].values
    
    return embedding

def main():
    if len(sys.argv) < 2:
        print("Usage: python process_single_doc.py <document_path>")
        return
    
    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    print(f"Processing document: {file_path}")
    
    # Read the document
    document = read_document(file_path)
    
    # Split into chunks
    chunks = chunk_document(document)
    print(f"Split into {len(chunks)} chunks")
    
    # Create a list to store embeddings for this document
    doc_embeddings = []
    
    # Process each chunk
    for j, chunk in enumerate(chunks):
        print(f"Processing chunk {j+1}/{len(chunks)}")
        
        try:
            # Generate embedding
            embedding = generate_embedding(chunk)
            
            # Create metadata
            metadata = {
                "source": file_path,
                "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
                "chunk_index": j,
                "text": chunk
            }
            
            # Create embedding record
            embedding_record = {
                "id": str(uuid.uuid4()),
                "embedding": embedding,
                "metadata": metadata
            }
            
            doc_embeddings.append(embedding_record)
            print(f"Successfully processed chunk {j+1}")
            
        except Exception as e:
            print(f"Error processing chunk {j+1}: {str(e)}")
    
    # Save embeddings to a JSON file
    output_file = f"embeddings_{os.path.basename(file_path).replace('.txt', '')}.json"
    with open(output_file, "w") as f:
        json.dump(doc_embeddings, f, indent=2)
    
    print(f"Saved {len(doc_embeddings)} embeddings to {output_file}")

if __name__ == "__main__":
    main()

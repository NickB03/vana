#!/usr/bin/env python3
"""
Upload a single document to Vector Search.
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

# Initialize Vertex AI
aiplatform.init(project=PROJECT_ID, location=LOCATION)
vertexai.init(project=PROJECT_ID, location=LOCATION)

def read_document(file_path):
    """Read a document file and return its content."""
    with open(file_path, "r") as f:
        return f.read()

def generate_embedding(text):
    """Generate an embedding for a single text using Vertex AI."""
    # Use a model that's available to your project
    model_name = "text-embedding-004"
    model = TextEmbeddingModel.from_pretrained(model_name)

    # Generate embedding
    print(f"Generating embedding using {model_name}...")
    response = model.get_embeddings([text])

    # Extract embedding
    embedding = response[0].values

    return embedding

def upload_to_vector_search(text, metadata):
    """Upload a single text to Vector Search index."""
    # Get the index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )

    if not indexes:
        raise ValueError(f"Vector Search index '{INDEX_NAME}' not found")

    index = indexes[0]

    # Generate embedding
    embedding = generate_embedding(text)

    # Prepare datapoint - using the correct format for the current API
    datapoint_id = str(uuid.uuid4())  # Generate a unique ID

    # Use only the minimal required fields
    datapoint = {
        "datapoint_id": datapoint_id,
        "feature_vector": embedding,
    }

    # Upload to Vector Search
    print(f"Uploading datapoint to Vector Search index...")
    index.upsert_datapoints(datapoints=[datapoint])
    print("Upload complete!")

def main():
    if len(sys.argv) < 2:
        print("Usage: python upload_single_doc.py <document_path>")
        return

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    print(f"Processing document: {file_path}")

    # Read the document
    document = read_document(file_path)

    # Prepare metadata
    metadata = {
        "source": file_path,
        "title": os.path.basename(file_path).replace(".txt", "").replace("_", " ").title(),
        "text": document
    }

    # Upload to Vector Search
    upload_to_vector_search(document, metadata)

    print(f"Document {file_path} uploaded successfully!")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Upload documents to Vector Search using Vertex AI.
This script uploads all text files in the knowledge_docs directory to the Vector Search index.
Vertex AI will handle chunking, embedding generation, and indexing automatically.
"""

import os
import glob
from dotenv import load_dotenv
from google.cloud import aiplatform

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")

def main():
    # Initialize Vertex AI
    aiplatform.init(project=PROJECT_ID, location=LOCATION)

    # Get all document files
    doc_files = glob.glob("knowledge_docs/*.txt")

    if not doc_files:
        print("No document files found in knowledge_docs/ directory")
        return

    print(f"Found {len(doc_files)} document files")

    # Get the Vector Search index
    indexes = aiplatform.MatchingEngineIndex.list(
        filter=f"display_name={INDEX_NAME}"
    )

    if not indexes:
        print(f"Vector Search index '{INDEX_NAME}' not found")
        return

    index = indexes[0]
    print(f"Using Vector Search index: {index.resource_name}")

    # Upload documents to the index
    print("Uploading documents to Vector Search...")

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

    # Upload documents to Vector Search
    try:
        # Use the direct document upload method if available
        if hasattr(index, "upload_documents"):
            corpus_name = "vana-knowledge"
            print(f"Uploading documents to corpus '{corpus_name}'...")

            response = index.upload_documents(
                corpus_name=corpus_name,
                documents=documents
            )

            print(f"Upload successful! Operation: {response.operation.name}")
        else:
            # If direct upload is not available, use the batch import method
            print("Direct document upload not available. Using batch import...")

            # Create a temporary jsonl file with the documents
            import json
            import tempfile

            with tempfile.NamedTemporaryFile(mode="w", suffix=".jsonl", delete=False) as f:
                temp_file = f.name
                for doc in documents:
                    f.write(json.dumps(doc) + "\n")

            print(f"Created temporary file: {temp_file}")

            # Upload the file to a GCS bucket
            from google.cloud import storage

            bucket_name = f"{PROJECT_ID}-vector-search"
            blob_name = "vana-documents.jsonl"

            storage_client = storage.Client()

            # Create the bucket if it doesn't exist
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

            # Import the documents to the index using the update method
            print("Using index.update() to import documents...")
            response = index.update(
                display_name=INDEX_NAME,
                description="VANA shared knowledge index",
                metadata_schema_uri="",
                content_source_uri=gcs_uri
            )

            print(f"Import started! Operation: {response.operation.name}")

            # Clean up the temporary file
            os.unlink(temp_file)

    except Exception as e:
        print(f"Error uploading documents: {str(e)}")

        # Provide guidance based on the error
        if "permission" in str(e).lower():
            print("\nPermission error detected. Please check:")
            print("1. Your service account has the necessary permissions")
            print("2. The Vector Search index is configured to allow updates")
            print("3. Your project has access to the Vector Search API")
        elif "not found" in str(e).lower():
            print("\nResource not found. Please check:")
            print("1. The Vector Search index exists and is correctly named")
            print("2. Your project and location settings are correct")
        else:
            print("\nTry using the Google Cloud Console to upload documents:")
            print("1. Go to https://console.cloud.google.com/vertex-ai/matching-engine/indexes")
            print("2. Select your index")
            print("3. Click 'Upload data' and follow the instructions")

if __name__ == "__main__":
    main()

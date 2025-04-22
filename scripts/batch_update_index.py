#!/usr/bin/env python3
"""
Batch Update Script for Vector Search Index

This script updates the Vector Search index using the batch update approach:
1. Exports embeddings to Google Cloud Storage
2. Creates an update operation for the index
3. Monitors the operation until completion

Use this script when the index doesn't support StreamUpdate.
"""

import os
import time
import json
import uuid
import logging
import argparse
from typing import List, Dict, Any
from dotenv import load_dotenv
import vertexai
from google.cloud import aiplatform
from google.cloud import storage

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("batch_update_index.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
BUCKET_NAME = os.getenv("GOOGLE_STORAGE_BUCKET")
INDEX_NAME = os.getenv("VECTOR_SEARCH_INDEX_NAME", "vana-shared-index")
INDEX_ID = os.getenv("INDEX_ID", "4167591072945405952")  # From project_handoff.md

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Batch update Vector Search index")
    parser.add_argument("--embeddings-file", required=True, help="Path to the embeddings file")
    parser.add_argument("--gcs-directory", default="embeddings", help="Directory in GCS bucket to store embeddings")
    parser.add_argument("--wait", action="store_true", help="Wait for the update operation to complete")
    parser.add_argument("--timeout", type=int, default=3600, help="Timeout in seconds for the update operation")
    return parser.parse_args()

def upload_to_gcs(local_file: str, gcs_directory: str) -> str:
    """Upload a file to Google Cloud Storage.
    
    Args:
        local_file: Path to the local file
        gcs_directory: Directory in the GCS bucket
        
    Returns:
        GCS URI of the uploaded file
    """
    try:
        # Initialize GCS client
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        
        # Generate a unique filename
        filename = os.path.basename(local_file)
        timestamp = int(time.time())
        gcs_filename = f"{gcs_directory}/{timestamp}_{filename}"
        
        # Upload the file
        blob = bucket.blob(gcs_filename)
        blob.upload_from_filename(local_file)
        
        # Get the GCS URI
        gcs_uri = f"gs://{BUCKET_NAME}/{gcs_filename}"
        logger.info(f"Uploaded {local_file} to {gcs_uri}")
        
        return gcs_uri
    except Exception as e:
        logger.error(f"Error uploading to GCS: {str(e)}")
        raise

def create_update_operation(index_id: str, gcs_uri: str) -> aiplatform.Operation:
    """Create an update operation for the Vector Search index.
    
    Args:
        index_id: ID of the Vector Search index
        gcs_uri: GCS URI of the embeddings file
        
    Returns:
        Update operation
    """
    try:
        # Initialize Vertex AI
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        
        # Get the index
        index_name = f"projects/{PROJECT_ID}/locations/{LOCATION}/indexes/{index_id}"
        index = aiplatform.MatchingEngineIndex(index_name=index_name)
        
        # Create the update operation
        operation = index.update_embeddings(
            contents_delta_uri=gcs_uri,
            is_complete_overwrite=False
        )
        
        logger.info(f"Created update operation: {operation.operation.name}")
        return operation
    except Exception as e:
        logger.error(f"Error creating update operation: {str(e)}")
        raise

def monitor_operation(operation: aiplatform.Operation, timeout: int = 3600) -> bool:
    """Monitor an operation until completion.
    
    Args:
        operation: Operation to monitor
        timeout: Timeout in seconds
        
    Returns:
        True if the operation completed successfully, False otherwise
    """
    try:
        # Start time
        start_time = time.time()
        
        # Monitor the operation
        while not operation.done():
            elapsed_time = time.time() - start_time
            if elapsed_time > timeout:
                logger.warning(f"Operation timed out after {elapsed_time:.1f} seconds")
                return False
            
            # Log progress
            logger.info(f"Operation in progress... ({elapsed_time:.1f}s elapsed)")
            time.sleep(30)  # Check every 30 seconds
        
        # Check if the operation was successful
        if operation.error.message:
            logger.error(f"Operation failed: {operation.error.message}")
            return False
        
        logger.info(f"Operation completed successfully in {time.time() - start_time:.1f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error monitoring operation: {str(e)}")
        return False

def prepare_embeddings_file(embeddings_file: str) -> str:
    """Prepare the embeddings file for upload to GCS.
    
    This function ensures the embeddings file is in the correct format for batch updates.
    
    Args:
        embeddings_file: Path to the embeddings file
        
    Returns:
        Path to the prepared embeddings file
    """
    try:
        # Read the embeddings file
        with open(embeddings_file, "r") as f:
            embeddings_data = json.load(f)
        
        # Check if the file is already in the correct format
        if isinstance(embeddings_data, list) and all(isinstance(item, dict) and "id" in item and "embedding" in item for item in embeddings_data):
            logger.info(f"Embeddings file is already in the correct format")
            return embeddings_file
        
        # Convert to the correct format if needed
        prepared_data = []
        for item in embeddings_data:
            prepared_item = {
                "id": item.get("id", str(uuid.uuid4())),
                "embedding": item.get("embedding", item.get("feature_vector", [])),
            }
            
            # Add metadata if available
            if "metadata" in item:
                prepared_item["metadata"] = item["metadata"]
            
            prepared_data.append(prepared_item)
        
        # Write the prepared data to a new file
        prepared_file = f"{os.path.splitext(embeddings_file)[0]}_prepared.json"
        with open(prepared_file, "w") as f:
            json.dump(prepared_data, f)
        
        logger.info(f"Prepared embeddings file: {prepared_file}")
        return prepared_file
    except Exception as e:
        logger.error(f"Error preparing embeddings file: {str(e)}")
        raise

def main():
    """Main function."""
    args = parse_arguments()
    
    logger.info("Starting batch update for Vector Search index")
    
    try:
        # Prepare the embeddings file
        prepared_file = prepare_embeddings_file(args.embeddings_file)
        
        # Upload to GCS
        gcs_uri = upload_to_gcs(prepared_file, args.gcs_directory)
        
        # Create update operation
        operation = create_update_operation(INDEX_ID, gcs_uri)
        
        # Monitor the operation if requested
        if args.wait:
            success = monitor_operation(operation, args.timeout)
            if success:
                logger.info("Batch update completed successfully")
            else:
                logger.error("Batch update failed")
                return 1
        else:
            logger.info(f"Batch update operation started. Check the operation status manually.")
        
        return 0
    except Exception as e:
        logger.error(f"Error in batch update: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)

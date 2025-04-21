#!/usr/bin/env python3
"""
Check if the embeddings file exists in Google Cloud Storage.
"""

import os
from dotenv import load_dotenv
from google.cloud import storage

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")

def main():
    # Create a storage client
    storage_client = storage.Client()
    
    # Get the bucket
    bucket_name = f"{PROJECT_ID}-vector-search"
    
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"Bucket {bucket_name} exists")
        
        # List all blobs in the bucket
        blobs = list(bucket.list_blobs())
        
        if blobs:
            print(f"Found {len(blobs)} files in the bucket:")
            for blob in blobs:
                print(f"  - {blob.name} ({blob.size} bytes)")
        else:
            print("No files found in the bucket")
            
    except Exception as e:
        print(f"Error accessing bucket: {str(e)}")

if __name__ == "__main__":
    main()

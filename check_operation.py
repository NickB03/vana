#!/usr/bin/env python3
"""
Check the status of a long-running operation in Vertex AI.
"""

import os
import requests
from dotenv import load_dotenv
from google.oauth2 import service_account
import google.auth.transport.requests

# Load environment variables
load_dotenv()

# Configure Google Cloud
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
OPERATION_ID = "5579223918356463616"  # From the update_index_api.py output

def main():
    # Get an access token
    credentials = service_account.Credentials.from_service_account_file(
        os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    access_token = credentials.token
    
    # Check the operation status using the REST API
    url = f"https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/operations/{OPERATION_ID}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    print(f"Checking operation status: {url}")
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        operation = response.json()
        print("Operation details:")
        print(f"  Name: {operation.get('name')}")
        print(f"  Done: {operation.get('done', False)}")
        
        if operation.get('done'):
            if 'error' in operation:
                print(f"  Error: {operation['error']}")
            else:
                print("  Operation completed successfully!")
                if 'response' in operation:
                    print(f"  Response: {operation['response']}")
        else:
            if 'metadata' in operation:
                metadata = operation['metadata']
                print(f"  Metadata: {metadata}")
                
                if 'createTime' in metadata.get('genericMetadata', {}):
                    create_time = metadata['genericMetadata']['createTime']
                    print(f"  Create time: {create_time}")
                
                if 'updateTime' in metadata.get('genericMetadata', {}):
                    update_time = metadata['genericMetadata']['updateTime']
                    print(f"  Last update: {update_time}")
    else:
        print(f"Error checking operation: {response.status_code} {response.text}")

if __name__ == "__main__":
    main()

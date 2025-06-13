import functions_framework
import os
from google.cloud import storage
from vertexai.preview import rag
import vertexai
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.cloud_event
def auto_import_rag_document(cloud_event):
    """
    Automatically import document when uploaded to GCS bucket
    Based on official Google Cloud RAG engine implementation
    """
    
    try:
        # Get file information from the event
        data = cloud_event.data
        bucket_name = data["bucket"]
        file_name = data["name"]
        
        logger.info(f"File uploaded: gs://{bucket_name}/{file_name}")
        
        # Only process files in the rag_documents folder
        if not file_name.startswith("rag_documents/"):
            logger.info("File not in rag_documents folder, skipping")
            return
        
        # Initialize Vertex AI
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "analystai-454200")
        project_number = os.environ.get("PROJECT_NUMBER", "960076421399")
        location = "us-central1"
        corpus_name = f"projects/{project_number}/locations/us-central1/ragCorpora/2305843009213693952"
        
        vertexai.init(project=project_id, location=location)
        
        # Import the file to RAG corpus using official parameters
        gcs_uri = f"gs://{bucket_name}/{file_name}"
        
        logger.info(f"Importing {gcs_uri} to RAG corpus...")
        
        response = rag.import_files(
            corpus_name,
            [gcs_uri],
            chunk_size=512,
            chunk_overlap=50,
            timeout=20000,
            max_embedding_requests_per_min=1400,
        )
        
        logger.info(f"Successfully started import for {gcs_uri}")
        logger.info(f"Response: {response}")
        
    except Exception as e:
        logger.error(f"Failed to import {gcs_uri}: {str(e)}")
        raise e

# requirements.txt for the Cloud Function:
# functions-framework==3.*
# google-cloud-aiplatform
# google-cloud-storage

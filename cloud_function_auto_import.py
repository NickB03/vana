import logging

import functions_framework
import vertexai
from google.cloud import storage
from vertexai.preview import rag

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@functions_framework.cloud_event
def auto_import_document(cloud_event):
    """Automatically import document when uploaded to GCS bucket"""

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
        project_id = "${GOOGLE_CLOUD_PROJECT}"
        location = "us-central1"
        corpus_name = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"

        vertexai.init(project=project_id, location=location)

        # Import the file to RAG corpus
        gcs_uri = f"gs://{bucket_name}/{file_name}"

        logger.info(f"Importing {gcs_uri} to RAG corpus...")

        response = rag.import_files(
            corpus_name=corpus_name,
            paths=[gcs_uri],
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(chunk_size=512, chunk_overlap=50)
            ),
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

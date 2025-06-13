#!/usr/bin/env python3
"""
Official RAG Engine Import Implementation

Based on the official Google Cloud Platform generative-ai repository:
https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/rag-engine

This script implements the proper way to import documents to RAG corpus
using the correct parameters and methods from the official documentation.
"""

import logging
import sys
import time
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration based on official examples
CORPUS_NAME = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"
PROJECT_ID = "${GOOGLE_CLOUD_PROJECT}"
LOCATION = "us-central1"

# Files that were uploaded to GCS
GCS_FILES = [
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/vana_system_overview.txt",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/anthropic-ai-agents.md",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/Newwhitepaper_Agents.pdf",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/a-practical-guide-to-building-agents.pdf",
]


def count_files_in_gcs_bucket(path: str) -> int:
    """Count files in GCS bucket path (simplified version)"""
    # For individual files, return 1
    # For directories, this would count all files
    return 1


def import_rag_files_from_gcs(paths: list[str], chunk_size: int, chunk_overlap: int, corpus_name: str) -> None:
    """
    Imports files from Google Cloud Storage to a RAG corpus.

    Based on official Google Cloud Platform implementation:
    https://github.com/GoogleCloudPlatform/generative-ai/blob/main/gemini/rag-engine/rag_engine_evaluation.ipynb

    Args:
      paths: A list of GCS paths to import files from.
      chunk_size: The size of each chunk to import.
      chunk_overlap: The overlap between consecutive chunks.
      corpus_name: The name of the RAG corpus to import files into.

    Returns:
      None
    """
    try:
        from vertexai.preview import rag

        total_imported, total_num_of_files = 0, 0

        logger.info(f"🚀 Starting official RAG import process...")
        logger.info(f"   Corpus: {corpus_name}")
        logger.info(f"   Chunk size: {chunk_size}")
        logger.info(f"   Chunk overlap: {chunk_overlap}")

        for path in paths:
            logger.info(f"📄 Processing: {path}")

            num_files_to_be_imported = count_files_in_gcs_bucket(path)
            total_num_of_files += num_files_to_be_imported

            max_retries, attempt, imported = 10, 0, 0

            while attempt < max_retries and imported < num_files_to_be_imported:
                logger.info(f"   Attempt {attempt + 1}/{max_retries}")

                try:
                    # Use the official parameters from Google Cloud documentation
                    response = rag.import_files(
                        corpus_name,
                        [path],
                        chunk_size=chunk_size,
                        chunk_overlap=chunk_overlap,
                        timeout=20000,
                        max_embedding_requests_per_min=1400,
                    )

                    imported += response.imported_rag_files_count or 0

                    logger.info(f"   ✅ Import response: {response}")
                    logger.info(f"   📊 Imported: {imported}/{num_files_to_be_imported}")

                    if hasattr(response, "skipped_rag_files_count"):
                        skipped = response.skipped_rag_files_count
                        if skipped > 0:
                            logger.warning(f"   ⚠️  {skipped} files were skipped")

                    break  # Success, exit retry loop

                except Exception as e:
                    logger.error(f"   ❌ Attempt {attempt + 1} failed: {str(e)}")
                    attempt += 1
                    if attempt < max_retries:
                        logger.info(f"   ⏳ Retrying in 5 seconds...")
                        time.sleep(5)

            total_imported += imported
            logger.info(f"   📈 Total imported so far: {total_imported}")

        logger.info(f"🎉 Import completed: {total_imported} files out of {total_num_of_files} imported!")

    except Exception as e:
        logger.error(f"❌ Failed to import files: {str(e)}")
        raise


def setup_vertex_ai():
    """Initialize Vertex AI with proper configuration"""
    try:
        import vertexai

        logger.info(f"🔧 Initializing Vertex AI...")
        logger.info(f"   Project: {PROJECT_ID}")
        logger.info(f"   Location: {LOCATION}")

        vertexai.init(project=PROJECT_ID, location=LOCATION)

        logger.info(f"✅ Vertex AI initialized successfully")
        return True

    except Exception as e:
        logger.error(f"❌ Failed to initialize Vertex AI: {str(e)}")
        return False


def create_cloud_function_trigger():
    """Create Cloud Function deployment script for automatic imports"""

    cloud_function_code = '''import functions_framework
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
        project_id = "${GOOGLE_CLOUD_PROJECT}"
        location = "us-central1"
        corpus_name = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"
        
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
'''

    # Save the Cloud Function code
    with open("cloud_function_official_rag_import.py", "w") as f:
        f.write(cloud_function_code)

    logger.info("📄 Official Cloud Function code saved to cloud_function_official_rag_import.py")
    logger.info("")
    logger.info("🚀 To deploy this Cloud Function:")
    logger.info("   gcloud functions deploy auto-import-rag-document \\")
    logger.info("     --runtime python39 \\")
    logger.info("     --trigger-bucket ${GOOGLE_CLOUD_PROJECT}-vector-search-docs \\")
    logger.info("     --entry-point auto_import_rag_document \\")
    logger.info("     --source . \\")
    logger.info("     --region us-central1 \\")
    logger.info("     --timeout 540s \\")
    logger.info("     --memory 512MB")

    return cloud_function_code


def main():
    """Main function implementing official RAG import process"""
    logger.info("🚀 Starting Official RAG Engine Import Process...")
    logger.info("   Based on: https://github.com/GoogleCloudPlatform/generative-ai/tree/main/gemini/rag-engine")

    # Initialize Vertex AI
    if not setup_vertex_ai():
        logger.error("❌ Failed to initialize Vertex AI")
        return False

    # Import documents using official method
    try:
        import_rag_files_from_gcs(paths=GCS_FILES, chunk_size=512, chunk_overlap=50, corpus_name=CORPUS_NAME)

        logger.info("✅ Official import process completed!")

    except Exception as e:
        logger.error(f"❌ Import process failed: {str(e)}")
        return False

    # Create Cloud Function for automation
    logger.info("")
    logger.info("🤖 Creating Cloud Function for automatic future imports...")
    create_cloud_function_trigger()

    logger.info("")
    logger.info("🎯 Next Steps:")
    logger.info("   1. Wait 5-10 minutes for import to complete")
    logger.info("   2. Test search functionality with real queries")
    logger.info("   3. Deploy Cloud Function for automatic future imports")
    logger.info("   4. Verify no more 'fallback knowledge' responses")

    return True


if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Official RAG import process completed successfully!")
    else:
        logger.error("💥 Official RAG import process failed!")
        sys.exit(1)

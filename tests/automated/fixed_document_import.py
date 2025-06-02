#!/usr/bin/env python3
"""
Fixed Document Import to RAG Corpus

This script properly imports documents from GCS to the RAG corpus
using the correct Vertex AI RAG API parameters.
"""

import logging
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
CORPUS_NAME = (
    "projects/960076421399/locations/us-central1/ragCorpora/2305843009213693952"
)
PROJECT_ID = "analystai-454200"
LOCATION = "us-central1"

# Files that were uploaded to GCS
GCS_FILES = [
    "gs://analystai-454200-vector-search-docs/rag_documents/vana_system_overview.txt",
    "gs://analystai-454200-vector-search-docs/rag_documents/anthropic-ai-agents.md",
    "gs://analystai-454200-vector-search-docs/rag_documents/Newwhitepaper_Agents.pdf",
    "gs://analystai-454200-vector-search-docs/rag_documents/a-practical-guide-to-building-agents.pdf",
]


def import_documents_correctly():
    """Import documents using the correct Vertex AI RAG API"""
    try:
        import vertexai
        from vertexai.preview import rag

        logger.info("🚀 Initializing Vertex AI...")
        logger.info(f"   Project: {PROJECT_ID}")
        logger.info(f"   Location: {LOCATION}")
        logger.info(f"   Corpus: {CORPUS_NAME}")

        vertexai.init(project=PROJECT_ID, location=LOCATION)

        logger.info(f"📥 Importing {len(GCS_FILES)} documents to RAG corpus...")

        # Import files with correct parameters
        response = rag.import_files(
            corpus_name=CORPUS_NAME,
            paths=GCS_FILES,
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(chunk_size=512, chunk_overlap=50)
            ),
        )

        logger.info("✅ Import operation started successfully")
        logger.info("   📋 Import details:")
        logger.info(f"      Response: {response}")
        logger.info(f"      Files: {len(GCS_FILES)}")
        logger.info("      Status: In Progress (asynchronous)")

        # Check if files were actually processed
        if hasattr(response, "skipped_rag_files_count"):
            skipped = response.skipped_rag_files_count
            if skipped > 0:
                logger.warning(f"⚠️  {skipped} files were skipped")
                logger.info("   This could mean:")
                logger.info("   - Files already exist in corpus")
                logger.info("   - File format not supported")
                logger.info("   - Files are being processed")

        logger.info("⏳ Import is running asynchronously...")
        logger.info("   This process typically takes 5-10 minutes to complete")
        logger.info("   Documents will be chunked, embedded, and indexed automatically")

        return response

    except Exception as e:
        logger.error(f"❌ Failed to import documents: {str(e)}")
        return None


def create_cloud_function_for_auto_import():
    """Create a Cloud Function that automatically imports documents when uploaded"""

    cloud_function_code = '''import functions_framework
from google.cloud import storage
from vertexai.preview import rag
import vertexai
import logging

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
        project_id = "analystai-454200"
        location = "us-central1"
        corpus_name = "projects/960076421399/locations/us-central1/ragCorpora/2305843009213693952"

        vertexai.init(project=project_id, location=location)

        # Import the file to RAG corpus
        gcs_uri = f"gs://{bucket_name}/{file_name}"

        logger.info(f"Importing {gcs_uri} to RAG corpus...")

        response = rag.import_files(
            corpus_name=corpus_name,
            paths=[gcs_uri],
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(
                    chunk_size=512,
                    chunk_overlap=50
                )
            )
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
    with open("cloud_function_auto_import.py", "w") as f:
        f.write(cloud_function_code)

    logger.info("📄 Cloud Function code saved to cloud_function_auto_import.py")
    logger.info("")
    logger.info("🚀 To deploy this Cloud Function:")
    logger.info("   1. gcloud functions deploy auto-import-document \\")
    logger.info("      --runtime python39 \\")
    logger.info("      --trigger-bucket analystai-454200-vector-search-docs \\")
    logger.info("      --entry-point auto_import_document \\")
    logger.info("      --source . \\")
    logger.info("      --region us-central1")
    logger.info("")
    logger.info(
        "   2. This will automatically import any new documents uploaded to the bucket"
    )

    return cloud_function_code


def main():
    """Main function to import documents and set up automation"""
    logger.info("🚀 Starting Fixed Document Import to RAG Corpus...")

    # Import documents
    import_response = import_documents_correctly()
    if not import_response:
        logger.error("❌ Failed to start import operation")
        return False

    # Create Cloud Function for future automation
    logger.info("")
    logger.info("🤖 Creating Cloud Function for automatic future imports...")
    create_cloud_function_for_auto_import()

    logger.info("")
    logger.info("🎯 Next Steps:")
    logger.info("   1. Wait 5-10 minutes for current import to complete")
    logger.info("   2. Test search functionality with real queries")
    logger.info("   3. Deploy Cloud Function for automatic future imports")
    logger.info("   4. Verify no more 'fallback knowledge' responses")

    return True


if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Document import and automation setup completed!")
    else:
        logger.error("💥 Document import failed!")
        sys.exit(1)

#!/usr/bin/env python3
"""
Trigger Document Import Using ADK Document Processor

This script uses the existing ADK Document Processor to properly import
documents from GCS to the RAG corpus, bypassing the skipped files issue.
"""

import sys
import logging
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import the ADK Document Processor
try:
    from tools.document_processing.adk_document_processor import ADKDocumentProcessor
except ImportError as e:
    logger.error(f"Failed to import ADK Document Processor: {e}")
    sys.exit(1)

# Configuration
CORPUS_NAME = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"
PROJECT_ID = "${GOOGLE_CLOUD_PROJECT}"
LOCATION = "us-central1"

# Files that were uploaded to GCS
GCS_FILES = [
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/vana_system_overview.txt",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/anthropic-ai-agents.md",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/Newwhitepaper_Agents.pdf",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/a-practical-guide-to-building-agents.pdf"
]

async def import_documents_with_adk():
    """Import documents using the ADK Document Processor"""
    try:
        logger.info("🚀 Initializing ADK Document Processor...")
        
        # Initialize the processor
        processor = ADKDocumentProcessor(
            project_id=PROJECT_ID,
            location=LOCATION,
            rag_corpus_name=CORPUS_NAME
        )
        
        logger.info(f"📥 Importing {len(GCS_FILES)} documents using ADK processor...")
        
        # Try bulk import from GCS
        for gcs_uri in GCS_FILES:
            logger.info(f"   Processing: {gcs_uri}")
            
            try:
                # Use the import_files_from_gcs method
                result = processor.import_files_from_gcs(
                    gcs_uri=gcs_uri,
                    chunk_size=512,
                    max_embedding_requests_per_min=1000
                )
                
                if result.get("success"):
                    logger.info(f"   ✅ Successfully imported: {gcs_uri}")
                    logger.info(f"      Operation: {result.get('import_response', {}).get('operation_id', 'unknown')}")
                else:
                    logger.error(f"   ❌ Failed to import: {gcs_uri}")
                    
            except Exception as file_error:
                logger.error(f"   ❌ Error importing {gcs_uri}: {str(file_error)}")
        
        logger.info("✅ ADK import process completed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to import with ADK processor: {str(e)}")
        return False

def create_cloud_function_trigger():
    """Create a Cloud Function to automatically import documents when uploaded to GCS"""
    logger.info("📋 Creating Cloud Function trigger for automatic document import...")
    
    # This would create a Cloud Function that triggers on GCS uploads
    # For now, we'll document the approach
    
    cloud_function_code = '''
import functions_framework
from google.cloud import storage
from vertexai.preview import rag
import vertexai

@functions_framework.cloud_event
def import_document_on_upload(cloud_event):
    """Triggered when a file is uploaded to the GCS bucket"""
    
    # Get file information from the event
    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]
    
    # Only process files in the rag_documents folder
    if not file_name.startswith("rag_documents/"):
        return
    
    # Initialize Vertex AI
    project_id = "${GOOGLE_CLOUD_PROJECT}"
    location = "us-central1"
    corpus_name = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"
    
    vertexai.init(project=project_id, location=location)
    
    # Import the file to RAG corpus
    gcs_uri = f"gs://{bucket_name}/{file_name}"
    
    try:
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
        logger.info(f"Successfully imported {gcs_uri}")
        
    except Exception as e:
        logger.error(f"Failed to import {gcs_uri}: {str(e)}")
'''
    
    logger.info("📄 Cloud Function code template created")
    logger.info("   To deploy this function:")
    logger.info("   1. Create a new Cloud Function")
    logger.info("   2. Set trigger to Cloud Storage (bucket: ${GOOGLE_CLOUD_PROJECT}-vector-search-docs)")
    logger.info("   3. Set event type to 'Finalize/Create'")
    logger.info("   4. Deploy the function code above")
    
    return cloud_function_code

def main():
    """Main function to trigger document import"""
    logger.info("🚀 Starting Document Import with ADK Processor...")
    
    # Try importing with ADK processor
    success = asyncio.run(import_documents_with_adk())
    
    if not success:
        logger.error("❌ ADK import failed, trying alternative approach...")
        
        # Create Cloud Function trigger for future uploads
        cloud_function_code = create_cloud_function_trigger()
        
        # Save the Cloud Function code for deployment
        with open("cloud_function_auto_import.py", "w") as f:
            f.write(cloud_function_code)
        
        logger.info("💡 Cloud Function code saved to cloud_function_auto_import.py")
    
    logger.info("🎯 Next Steps:")
    logger.info("   1. Wait 5-10 minutes for import to complete")
    logger.info("   2. Test search functionality")
    logger.info("   3. Deploy Cloud Function for automatic future imports")
    
    return success

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Document import triggered successfully!")
    else:
        logger.error("💥 Document import failed!")
        sys.exit(1)

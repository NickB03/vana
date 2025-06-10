#!/usr/bin/env python3
"""
Import Uploaded Documents to RAG Corpus

This script imports the documents that were uploaded to GCS into the RAG corpus.
"""

import sys
import logging
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The corpus that was created
CORPUS_NAME = "projects/${PROJECT_NUMBER}/locations/us-central1/ragCorpora/2305843009213693952"

# Files that were uploaded
UPLOADED_FILES = [
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/vana_system_overview.txt",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/anthropic-ai-agents.md",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/Newwhitepaper_Agents.pdf",
    "gs://${GOOGLE_CLOUD_PROJECT}-vector-search-docs/rag_documents/a-practical-guide-to-building-agents.pdf"
]

def import_documents_to_rag():
    """Import uploaded documents into the RAG corpus"""
    try:
        import vertexai
        from vertexai.preview import rag
        
        # Initialize Vertex AI with the correct project
        project_id = "${GOOGLE_CLOUD_PROJECT}"  # Use project ID, not number
        location = "us-central1"
        
        logger.info(f"🚀 Initializing Vertex AI...")
        logger.info(f"   Project: {project_id}")
        logger.info(f"   Location: {location}")
        logger.info(f"   Corpus: {CORPUS_NAME}")
        
        vertexai.init(project=project_id, location=location)
        
        logger.info(f"📥 Importing {len(UPLOADED_FILES)} documents to RAG corpus...")
        
        # Import files from GCS
        response = rag.import_files(
            corpus_name=CORPUS_NAME,
            paths=UPLOADED_FILES,
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(
                    chunk_size=512,
                    chunk_overlap=50
                )
            )
        )
        
        logger.info(f"✅ Import operation started successfully")
        logger.info("   📋 Import details:")
        logger.info(f"      Response: {response}")
        logger.info(f"      Files: {len(UPLOADED_FILES)}")
        logger.info("      Status: In Progress (asynchronous)")
        
        logger.info("⏳ Import is running asynchronously...")
        logger.info("   This process typically takes 5-10 minutes to complete")
        logger.info("   Documents will be chunked, embedded, and indexed automatically")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ Failed to import documents to RAG: {str(e)}")
        return None

def main():
    """Main function to import documents"""
    logger.info("🚀 Starting Document Import to RAG Corpus...")
    
    # Import documents to RAG
    import_response = import_documents_to_rag()
    if not import_response:
        logger.error("❌ Failed to start import operation")
        return False
    
    logger.info("✅ Document import process started!")
    logger.info("")
    logger.info("🎯 Next Steps:")
    logger.info("   1. Wait 5-10 minutes for import to complete")
    logger.info("   2. Test with real vector search queries")
    logger.info("   3. Verify no more 'fallback knowledge' responses")
    logger.info("   4. Documents should now be searchable in the RAG corpus")
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Document import setup completed successfully!")
    else:
        logger.error("💥 Document import setup failed!")
        sys.exit(1)

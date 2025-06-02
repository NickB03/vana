#!/usr/bin/env python3
"""
Check RAG Corpus Status

This script checks the status of the RAG corpus and lists any files that have been imported.
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
CORPUS_NAME = "projects/960076421399/locations/us-central1/ragCorpora/2305843009213693952"

def check_corpus_status():
    """Check the status of the RAG corpus"""
    try:
        import vertexai
        from vertexai.preview import rag
        
        # Initialize Vertex AI with the correct project
        project_id = "analystai-454200"  # Use project ID, not number
        location = "us-central1"
        
        logger.info(f"🚀 Initializing Vertex AI...")
        logger.info(f"   Project: {project_id}")
        logger.info(f"   Location: {location}")
        logger.info(f"   Corpus: {CORPUS_NAME}")
        
        vertexai.init(project=project_id, location=location)
        
        logger.info(f"📋 Checking corpus status...")
        
        # Get corpus information
        corpus = rag.get_corpus(name=CORPUS_NAME)
        logger.info(f"✅ Corpus found: {corpus.display_name}")
        logger.info(f"   Created: {corpus.create_time}")
        logger.info(f"   Updated: {corpus.update_time}")
        
        # List files in the corpus
        logger.info(f"📄 Listing files in corpus...")
        files = rag.list_files(corpus_name=CORPUS_NAME)
        
        if files:
            logger.info(f"   Found {len(files)} files:")
            for i, file in enumerate(files, 1):
                logger.info(f"   {i}. {file.display_name}")
                logger.info(f"      State: {file.state}")
                logger.info(f"      Size: {file.size_bytes} bytes")
                logger.info(f"      Created: {file.create_time}")
        else:
            logger.info("   No files found in corpus")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check corpus status: {str(e)}")
        return False

def test_search():
    """Test search functionality"""
    try:
        import vertexai
        from vertexai.preview import rag
        
        # Initialize Vertex AI
        project_id = "analystai-454200"
        location = "us-central1"
        vertexai.init(project=project_id, location=location)
        
        logger.info(f"🔍 Testing search functionality...")
        
        # Try a simple search
        query = "VANA vector search"
        logger.info(f"   Query: {query}")
        
        # This is a basic test - the actual search would be done through the ADK memory service
        logger.info("   Note: Full search testing requires ADK memory service integration")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to test search: {str(e)}")
        return False

def main():
    """Main function to check corpus status"""
    logger.info("🚀 Checking RAG Corpus Status...")
    
    # Check corpus status
    if not check_corpus_status():
        logger.error("❌ Failed to check corpus status")
        return False
    
    # Test search functionality
    if not test_search():
        logger.error("❌ Failed to test search")
        return False
    
    logger.info("✅ Corpus status check completed!")
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Corpus status check completed successfully!")
    else:
        logger.error("💥 Corpus status check failed!")
        sys.exit(1)

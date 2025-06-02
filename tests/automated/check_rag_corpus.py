#!/usr/bin/env python3
"""
Check RAG Corpus Status

This script checks if the RAG corpus exists and has data,
helping to diagnose why the system is returning fallback responses.
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables
load_dotenv(project_root / ".env.production")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_rag_corpus_status():
    """Check the status of the RAG corpus"""
    
    # Load environment
    from config.environment import EnvironmentConfig
    env_config = EnvironmentConfig.get_adk_memory_config()
    
    logger.info("🔍 Checking RAG Corpus Status...")
    logger.info(f"   RAG Corpus Resource Name: {env_config.get('rag_corpus_resource_name')}")
    
    try:
        # Try to initialize the ADK Memory Service
        from lib._shared_libraries.adk_memory_service import ADKMemoryService
        
        memory_service = ADKMemoryService(use_vertex_ai=True)
        
        if memory_service.is_available():
            logger.info("✅ ADK Memory Service initialized successfully")
            
            # Try a test search
            logger.info("🔍 Testing memory search...")
            try:
                results = memory_service.search_memory("test query about vector search")

                # Handle async results if needed
                if hasattr(results, '__await__'):
                    import asyncio
                    results = asyncio.run(results)

                if results and isinstance(results, list):
                    logger.info(f"✅ Memory search returned {len(results)} results")
                    for i, result in enumerate(results[:3]):  # Show first 3 results
                        content = result.get('content', 'No content') if isinstance(result, dict) else str(result)
                        logger.info(f"   Result {i+1}: {content[:100]}...")
                else:
                    logger.warning("⚠️ Memory search returned no results - corpus may be empty")

            except Exception as search_error:
                logger.error(f"❌ Memory search failed: {str(search_error)}")
                
        else:
            logger.error("❌ ADK Memory Service not available")
            
    except Exception as e:
        logger.error(f"❌ Error checking RAG corpus: {str(e)}")
        
        # Try to get more specific error information
        try:
            import google.cloud.aiplatform as aiplatform
            
            # Initialize Vertex AI
            project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
            location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            logger.info(f"🔍 Checking Vertex AI access...")
            logger.info(f"   Project: {project_id}")
            logger.info(f"   Location: {location}")
            
            aiplatform.init(project=project_id, location=location)
            logger.info("✅ Vertex AI initialized successfully")
            
        except Exception as vertex_error:
            logger.error(f"❌ Vertex AI initialization failed: {str(vertex_error)}")

def check_environment_variables():
    """Check environment variable configuration"""
    logger.info("🔍 Checking Environment Variables...")
    
    env_vars = [
        "GOOGLE_CLOUD_PROJECT",
        "GOOGLE_CLOUD_LOCATION", 
        "VANA_RAG_CORPUS_ID",
        "RAG_CORPUS_RESOURCE_NAME",
        "GOOGLE_GENAI_USE_VERTEXAI"
    ]
    
    for var in env_vars:
        value = os.getenv(var)
        if value:
            logger.info(f"   ✅ {var}: {value}")
        else:
            logger.warning(f"   ⚠️ {var}: Not set")

def check_authentication():
    """Check Google Cloud authentication"""
    logger.info("🔍 Checking Google Cloud Authentication...")
    
    try:
        import google.auth
        
        credentials, project = google.auth.default()
        logger.info(f"✅ Authentication successful")
        logger.info(f"   Project: {project}")
        logger.info(f"   Credentials type: {type(credentials).__name__}")
        
    except Exception as e:
        logger.error(f"❌ Authentication failed: {str(e)}")

if __name__ == "__main__":
    logger.info("🚀 Starting RAG Corpus Status Check...")
    
    check_environment_variables()
    check_authentication()
    check_rag_corpus_status()
    
    logger.info("✅ RAG Corpus Status Check Complete")

#!/usr/bin/env python3
"""
Import Documents to RAG Corpus

This script uploads sample documents to Google Cloud Storage
and imports them into the RAG corpus for real vector search.
"""

import logging
import sys
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

# The corpus that was just created
CORPUS_NAME = (
    "projects/960076421399/locations/us-central1/ragCorpora/2305843009213693952"
)
BUCKET_NAME = "analysiai-454200-vector-search-docs"


def setup_services():
    """Initialize required Google Cloud services"""
    try:
        import vertexai
        from google.cloud import storage

        project_id = (
            "analystai-454200"  # Use the actual project ID (not project number)
        )
        location = "us-central1"

        logger.info("🚀 Initializing services...")
        logger.info(f"   Project: {project_id}")
        logger.info(f"   Location: {location}")
        logger.info(f"   Bucket: {BUCKET_NAME}")

        vertexai.init(project=project_id, location=location)
        storage_client = storage.Client(project=project_id)

        logger.info("✅ Services initialized successfully")
        return project_id, location, storage_client

    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {str(e)}")
        return None, None, None


def upload_documents_to_gcs(storage_client):
    """Upload sample documents to Google Cloud Storage"""
    try:
        bucket = storage_client.bucket(BUCKET_NAME)

        # Sample documents with real VANA knowledge
        sample_docs = [
            {
                "filename": "vana_system_overview.txt",
                "content": """VANA Vector Search System Documentation

VANA is an advanced AI agent system that uses vector search and RAG (Retrieval-Augmented Generation) for intelligent knowledge retrieval. The system is built on Google ADK (Agent Development Kit) and uses Vertex AI for vector embeddings and semantic search.

Key Features:
- Hybrid semantic search combining vector similarity and keyword matching
- Real-time knowledge corpus with automatic embedding generation
- Multi-phase development architecture with Phase 1 (ReAct framework), Phase 2 (cognitive enhancements), and Phase 3 (real vector search implementation)
- Integration with Google Cloud Vertex AI RAG engine
- Production deployment on Google Cloud Run

Technical Architecture:
- Vector embeddings using text-embedding-004 model (768 dimensions)
- Vertex AI Vector Search for similarity matching
- ADK Memory Service for knowledge management
- Environment-based configuration with VANA_RAG_CORPUS_ID support

The system replaces mock data with real vector search capabilities, enabling semantic understanding and contextual knowledge retrieval for enhanced AI agent performance.
""",
            },
            {
                "filename": "vector_search_phase2.txt",
                "content": """Vector Search Phase 2 Implementation Details

Phase 2 of the VANA vector search implementation includes:

1. Enhanced Search Architecture:
   - Hybrid search combining semantic similarity and keyword matching
   - Multi-stage retrieval with ranking and relevance scoring
   - Context window optimization for improved results
   - Query expansion and refinement capabilities

2. ADK Memory Integration:
   - VertexAiRagMemoryService for production knowledge storage
   - Environment variable priority system (VANA_RAG_CORPUS_ID → RAG_CORPUS_RESOURCE_NAME)
   - Backward compatibility with existing configurations
   - Real-time corpus updates and synchronization

3. Performance Optimizations:
   - Query result caching with configurable TTL
   - Batch processing for multiple queries
   - Error handling and fallback mechanisms
   - Response grounding with citations

4. Tool Registration:
   - search_knowledge function for semantic search
   - load_memory function for memory retrieval
   - Proper function naming without underscore prefixes
   - Integration with ADK tool framework

Configuration:
- VANA_RAG_CORPUS_ID: projects/960076421399/locations/us-central1/ragCorpora/2305843009213693952
- Similarity top-k: 5 results
- Vector distance threshold: 0.7
- Embedding model: text-embedding-004
- Storage buckets: analysiai-454200-vector-search, analysiai-454200-vector-search-docs
""",
            },
            {
                "filename": "environment_configuration.txt",
                "content": """VANA Environment Configuration and Deployment

VANA supports multiple deployment environments with smart configuration detection:

Development Environment:
- Local development with .env.local configuration
- API key authentication for testing
- Mock services for rapid development
- Hot reloading and debugging capabilities

Production Environment:
- Google Cloud Run deployment
- Vertex AI authentication using service accounts
- Real vector search with production RAG corpus
- Environment variables: VANA_ENV=production
- Automatic scaling and load balancing

Key Environment Variables:
- GOOGLE_CLOUD_PROJECT: 960076421399 (actual project for RAG corpus)
- GOOGLE_CLOUD_LOCATION: us-central1
- VANA_RAG_CORPUS_ID: Corpus identifier for vector search
- RAG_CORPUS_RESOURCE_NAME: Full resource name for backward compatibility
- GOOGLE_GENAI_USE_VERTEXAI: Enable Vertex AI authentication

Storage Infrastructure:
- analysiai-454200-vector-search: Primary storage bucket
- analysiai-454200-vector-search-docs: Document storage bucket
- Both buckets configured in us-central1 region with Standard storage class
- Cross-project access configured for RAG corpus integration

Deployment Process:
1. Build container image with proper dependencies
2. Deploy to Cloud Run with environment variables
3. Configure service account permissions for Vertex AI access
4. Validate deployment with automated testing
5. Monitor performance and error rates

The system uses a hybrid authentication approach with API keys for local development and Vertex AI service accounts for production deployment.
""",
            },
        ]

        uploaded_files = []

        for doc in sample_docs:
            try:
                logger.info(f"📄 Uploading {doc['filename']}...")

                # Create blob and upload content
                blob = bucket.blob(f"rag_documents/{doc['filename']}")
                blob.upload_from_string(doc["content"], content_type="text/plain")

                # Get the GCS URI
                gcs_uri = f"gs://{BUCKET_NAME}/rag_documents/{doc['filename']}"
                uploaded_files.append(gcs_uri)

                logger.info(f"   ✅ Uploaded to: {gcs_uri}")

            except Exception as upload_error:
                logger.error(
                    f"   ❌ Failed to upload {doc['filename']}: {str(upload_error)}"
                )

        logger.info(f"✅ Uploaded {len(uploaded_files)} documents to GCS")
        return uploaded_files

    except Exception as e:
        logger.error(f"❌ Failed to upload documents: {str(e)}")
        return []


def import_documents_to_rag(uploaded_files):
    """Import uploaded documents into the RAG corpus"""
    try:
        from vertexai.preview import rag

        logger.info(f"📥 Importing {len(uploaded_files)} documents to RAG corpus...")
        logger.info(f"   Corpus: {CORPUS_NAME}")

        # Import files from GCS
        response = rag.import_files(
            corpus_name=CORPUS_NAME,
            paths=uploaded_files,
            transformation_config=rag.TransformationConfig(
                chunking_config=rag.ChunkingConfig(chunk_size=512, chunk_overlap=50)
            ),
        )

        logger.info(f"✅ Import operation started: {response.name}")
        logger.info("   📋 Import details:")
        logger.info(f"      Operation: {response.name}")
        logger.info(f"      Files: {len(uploaded_files)}")
        logger.info("      Status: In Progress (asynchronous)")

        logger.info("⏳ Import is running asynchronously...")
        logger.info("   This process typically takes 5-10 minutes to complete")
        logger.info("   Documents will be chunked, embedded, and indexed automatically")

        return response

    except Exception as e:
        logger.error(f"❌ Failed to import documents to RAG: {str(e)}")
        return None


def update_environment_config():
    """Update environment configuration with correct corpus ID"""
    logger.info("🔧 Environment Configuration Update Required:")
    logger.info("")
    logger.info("   The RAG corpus was created in project 960076421399, but your")
    logger.info("   environment configuration points to analystai-454200.")
    logger.info("")
    logger.info("   To fix this, update your .env.production file:")
    logger.info("")
    logger.info("   BEFORE:")
    logger.info(
        "   RAG_CORPUS_RESOURCE_NAME=projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus"
    )
    logger.info("")
    logger.info("   AFTER:")
    logger.info(f"   RAG_CORPUS_RESOURCE_NAME={CORPUS_NAME}")
    logger.info("")
    logger.info("   Also update:")
    logger.info("   GOOGLE_CLOUD_PROJECT=960076421399")
    logger.info("")
    logger.info("   Then redeploy the service to use the real RAG corpus.")


def main():
    """Main function to upload and import documents"""
    logger.info("🚀 Starting Document Import to RAG Corpus...")

    # Initialize services
    project_id, location, storage_client = setup_services()
    if not project_id:
        logger.error("❌ Failed to initialize services")
        return False

    # Upload documents to GCS
    uploaded_files = upload_documents_to_gcs(storage_client)
    if not uploaded_files:
        logger.error("❌ No documents uploaded")
        return False

    # Import documents to RAG
    import_response = import_documents_to_rag(uploaded_files)
    if not import_response:
        logger.error("❌ Failed to start import operation")
        return False

    # Provide configuration update instructions
    update_environment_config()

    logger.info("✅ Document import process completed!")
    logger.info("")
    logger.info("🎯 Next Steps:")
    logger.info("   1. Wait 5-10 minutes for import to complete")
    logger.info("   2. Update environment configuration (see above)")
    logger.info("   3. Redeploy the VANA service")
    logger.info("   4. Test with real vector search queries")
    logger.info("   5. Verify no more 'fallback knowledge' responses")

    return True


if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 Document import setup completed successfully!")
    else:
        logger.error("💥 Document import setup failed!")
        sys.exit(1)

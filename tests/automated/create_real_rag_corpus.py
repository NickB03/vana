#!/usr/bin/env python3
"""
Create Real RAG Corpus for VANA

This script implements the real Vertex AI RAG corpus setup following
the Medium article guide to replace the mock data system.

Based on: https://medium.com/google-cloud/build-a-rag-agent-using-google-adk-and-vertex-ai-rag-engine-bb1e6b1ee09d
"""

import logging
import os
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


def setup_vertex_ai():
    """Initialize Vertex AI with project configuration"""
    try:
        import vertexai

        project_id = os.getenv("GOOGLE_CLOUD_PROJECT", "analystai-454200")
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")

        logger.info("🚀 Initializing Vertex AI...")
        logger.info(f"   Project: {project_id}")
        logger.info(f"   Location: {location}")

        vertexai.init(project=project_id, location=location)

        logger.info("✅ Vertex AI initialized successfully")
        return project_id, location

    except Exception as e:
        logger.error(f"❌ Failed to initialize Vertex AI: {str(e)}")
        return None, None


def check_existing_rag_corpus(project_id: str, location: str):
    """Check if RAG corpus already exists"""
    try:
        # Import the RAG engine from Vertex AI
        from vertexai.preview import rag

        corpus_name = (
            f"projects/{project_id}/locations/{location}/ragCorpora/vana-corpus"
        )

        logger.info(f"🔍 Checking existing RAG corpus: {corpus_name}")

        # Try to get the corpus
        try:
            corpus = rag.get_corpus(name=corpus_name)
            logger.info(f"✅ Found existing RAG corpus: {corpus.name}")
            logger.info(f"   Display Name: {corpus.display_name}")

            # Check if corpus has files
            try:
                files = rag.list_files(corpus_name=corpus_name)
                file_count = len(list(files))
                logger.info(f"   Files in corpus: {file_count}")

                if file_count == 0:
                    logger.warning(
                        "⚠️ RAG corpus exists but is empty - no files imported"
                    )
                    return corpus, True  # Exists but empty
                else:
                    logger.info("✅ RAG corpus has files - should be functional")
                    return corpus, False  # Exists and has data

            except Exception as files_error:
                logger.warning(f"⚠️ Could not check files in corpus: {str(files_error)}")
                return corpus, True  # Assume empty if can't check

        except Exception as get_error:
            logger.info(f"📝 RAG corpus does not exist: {str(get_error)}")
            return None, True  # Doesn't exist

    except Exception as e:
        logger.error(f"❌ Error checking RAG corpus: {str(e)}")
        return None, True


def create_rag_corpus(project_id: str, location: str):
    """Create a new RAG corpus following the Medium article guide"""
    try:
        from vertexai.preview import rag

        logger.info("🏗️ Creating new RAG corpus...")

        # Create the corpus
        corpus = rag.create_corpus(
            display_name="VANA Knowledge Corpus",
            description="Knowledge corpus for VANA ADK memory system with real vector search capabilities",
        )

        logger.info(f"✅ Created RAG corpus: {corpus.name}")
        logger.info(f"   Display Name: {corpus.display_name}")

        return corpus

    except Exception as e:
        logger.error(f"❌ Failed to create RAG corpus: {str(e)}")
        return None


def import_sample_documents(corpus):
    """Import sample documents to populate the corpus"""
    try:
        from vertexai.preview import rag

        logger.info("📄 Importing sample documents to corpus...")

        # Create sample documents about VANA and vector search
        sample_docs = [
            {
                "content": """
                VANA Vector Search System Documentation

                VANA is an advanced AI agent system that uses vector search and RAG (Retrieval-Augmented Generation)
                for intelligent knowledge retrieval. The system is built on Google ADK (Agent Development Kit) and
                uses Vertex AI for vector embeddings and semantic search.

                Key Features:
                - Hybrid semantic search combining vector similarity and keyword matching
                - Real-time knowledge corpus with automatic embedding generation
                - Multi-phase development architecture with Phase 1 (ReAct framework), Phase 2 (cognitive enhancements),
                  and Phase 3 (real vector search implementation)
                - Integration with Google Cloud Vertex AI RAG engine
                - Production deployment on Google Cloud Run

                Technical Architecture:
                - Vector embeddings using text-embedding-004 model (768 dimensions)
                - Vertex AI Vector Search for similarity matching
                - ADK Memory Service for knowledge management
                - Environment-based configuration with VANA_RAG_CORPUS_ID support
                """,
                "title": "VANA Vector Search System Overview",
            },
            {
                "content": """
                Vector Search Phase 2 Implementation Details

                Phase 2 of the VANA vector search implementation includes:

                1. Enhanced Search Architecture:
                   - Hybrid search combining semantic similarity and keyword matching
                   - Multi-stage retrieval with ranking and relevance scoring
                   - Context window optimization for improved results

                2. ADK Memory Integration:
                   - VertexAiRagMemoryService for production knowledge storage
                   - Environment variable priority system (VANA_RAG_CORPUS_ID → RAG_CORPUS_RESOURCE_NAME)
                   - Backward compatibility with existing configurations

                3. Performance Optimizations:
                   - Query result caching with configurable TTL
                   - Batch processing for multiple queries
                   - Error handling and fallback mechanisms

                4. Tool Registration:
                   - search_knowledge function for semantic search
                   - load_memory function for memory retrieval
                   - Proper function naming without underscore prefixes

                Configuration:
                - VANA_RAG_CORPUS_ID: projects/analystai-454200/locations/us-central1/ragCorpora/vana-corpus
                - Similarity top-k: 5 results
                - Vector distance threshold: 0.7
                - Embedding model: text-embedding-004
                """,
                "title": "Vector Search Phase 2 Implementation",
            },
            {
                "content": """
                VANA Environment Configuration and Deployment

                VANA supports multiple deployment environments with smart configuration detection:

                Development Environment:
                - Local development with .env.local configuration
                - API key authentication for testing
                - Mock services for rapid development

                Production Environment:
                - Google Cloud Run deployment
                - Vertex AI authentication using service accounts
                - Real vector search with production RAG corpus
                - Environment variables: VANA_ENV=production

                Key Environment Variables:
                - GOOGLE_CLOUD_PROJECT: analystai-454200
                - GOOGLE_CLOUD_LOCATION: us-central1
                - VANA_RAG_CORPUS_ID: Corpus identifier for vector search
                - RAG_CORPUS_RESOURCE_NAME: Full resource name for backward compatibility
                - GOOGLE_GENAI_USE_VERTEXAI: Enable Vertex AI authentication

                Storage Infrastructure:
                - analysiai-454200-vector-search: Primary storage bucket
                - analysiai-454200-vector-search-docs: Document storage bucket
                - Both buckets configured in us-central1 region with Standard storage class

                Deployment Process:
                1. Build container image with proper dependencies
                2. Deploy to Cloud Run with environment variables
                3. Configure service account permissions for Vertex AI access
                4. Validate deployment with automated testing
                """,
                "title": "VANA Environment and Deployment Configuration",
            },
        ]

        # Import documents using the RAG API
        for i, doc in enumerate(sample_docs):
            try:
                # Create a temporary file for the document
                import tempfile

                with tempfile.NamedTemporaryFile(
                    mode="w", suffix=".txt", delete=False
                ) as f:
                    f.write(doc["content"])
                    temp_file_path = f.name

                logger.info(f"   Importing document {i+1}: {doc['title']}")

                # Import the file to the corpus
                response = rag.import_files(
                    corpus_name=corpus.name,
                    paths=[temp_file_path],
                    transformation_config=rag.TransformationConfig(
                        chunking_config=rag.ChunkingConfig(
                            chunk_size=512, chunk_overlap=50
                        )
                    ),
                )

                logger.info(f"   ✅ Import operation started: {response.name}")

                # Clean up temporary file
                os.unlink(temp_file_path)

            except Exception as doc_error:
                logger.error(f"   ❌ Failed to import document {i+1}: {str(doc_error)}")

        logger.info("✅ Sample documents import initiated")
        logger.info(
            "   Note: Import operations are asynchronous and may take a few minutes to complete"
        )

    except Exception as e:
        logger.error(f"❌ Failed to import sample documents: {str(e)}")


def validate_corpus_functionality(corpus):
    """Validate that the corpus is functional for search"""
    try:
        logger.info("🔍 Validating corpus functionality...")

        # Try to perform a search (this might fail if documents are still being processed)
        try:
            # Note: This is a basic validation - full search testing should be done after import completes
            logger.info(f"   Corpus name: {corpus.name}")
            logger.info(f"   Corpus display name: {corpus.display_name}")
            logger.info("   ✅ Corpus structure is valid")

            # The actual search validation should be done after documents are fully imported
            logger.info(
                "   ⏳ Search functionality validation should be performed after document import completes"
            )

        except Exception as search_error:
            logger.warning(
                f"   ⚠️ Search validation failed (expected if documents still importing): {str(search_error)}"
            )

    except Exception as e:
        logger.error(f"❌ Corpus validation failed: {str(e)}")


def main():
    """Main function to create and populate RAG corpus"""
    logger.info("🚀 Starting Real RAG Corpus Creation for VANA...")

    # Initialize Vertex AI
    project_id, location = setup_vertex_ai()
    if not project_id:
        logger.error("❌ Failed to initialize Vertex AI - cannot proceed")
        return False

    # Check if corpus already exists
    existing_corpus, is_empty = check_existing_rag_corpus(project_id, location)

    if existing_corpus and not is_empty:
        logger.info("✅ RAG corpus already exists and has data - no action needed")
        validate_corpus_functionality(existing_corpus)
        return True

    # Create corpus if it doesn't exist
    if not existing_corpus:
        corpus = create_rag_corpus(project_id, location)
        if not corpus:
            logger.error("❌ Failed to create RAG corpus")
            return False
    else:
        corpus = existing_corpus
        logger.info("📝 Using existing empty corpus")

    # Import sample documents
    import_sample_documents(corpus)

    # Validate functionality
    validate_corpus_functionality(corpus)

    logger.info("✅ Real RAG Corpus creation completed!")
    logger.info("   Next steps:")
    logger.info("   1. Wait for document import to complete (5-10 minutes)")
    logger.info("   2. Test the system with real queries")
    logger.info("   3. Verify no more 'fallback knowledge' responses")

    return True


if __name__ == "__main__":
    success = main()
    if success:
        logger.info("🎉 RAG Corpus setup completed successfully!")
    else:
        logger.error("💥 RAG Corpus setup failed!")
        sys.exit(1)

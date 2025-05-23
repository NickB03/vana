#!/usr/bin/env python3
"""
Comprehensive Test Suite for VANA

This script runs all the tests for VANA components, including:
1. Document Processing
2. Vector Search
3. Knowledge Graph
4. Hybrid Search
5. Enhanced Hybrid Search
6. Web Search
7. Feedback System
"""

import os
import sys
import logging
import unittest
import importlib
from typing import List, Dict, Any

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("test_suite.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TestSuite(unittest.TestCase):
    """Test suite for VANA components"""

    def setUp(self):
        """Set up test environment"""
        # Create test directories if they don't exist
        os.makedirs("tests/test_data", exist_ok=True)
        os.makedirs("tests/test_data/feedback", exist_ok=True)
        os.makedirs("tests/test_data/documents", exist_ok=True)

    def test_document_processor(self):
        """Test document processor"""
        logger.info("Testing Document Processor...")
        
        try:
            from tools.document_processing.document_processor import DocumentProcessor
            
            # Initialize document processor
            processor = DocumentProcessor()
            
            # Create a test document
            test_doc_path = "tests/test_data/documents/test_doc.md"
            with open(test_doc_path, "w") as f:
                f.write("# Test Document\n\nThis is a test document for the document processor.")
            
            # Process document
            document = processor.process_document(
                file_path=test_doc_path,
                metadata={
                    "source": "test",
                    "doc_id": "test-doc-001"
                }
            )
            
            # Verify document processing
            self.assertIsNotNone(document)
            self.assertEqual(document.get("title"), "# Test Document")
            self.assertIn("chunks", document)
            self.assertGreater(len(document.get("chunks", [])), 0)
            
            logger.info("Document Processor test passed")
        except Exception as e:
            logger.error(f"Document Processor test failed: {str(e)}")
            raise

    def test_semantic_chunker(self):
        """Test semantic chunker"""
        logger.info("Testing Semantic Chunker...")
        
        try:
            from tools.document_processing.semantic_chunker import SemanticChunker
            
            # Initialize semantic chunker
            chunker = SemanticChunker()
            
            # Create a test document
            document = {
                "text": "# Test Document\n\n## Section 1\n\nThis is section 1.\n\n## Section 2\n\nThis is section 2.",
                "metadata": {
                    "source": "test",
                    "doc_id": "test-doc-001"
                }
            }
            
            # Chunk document
            chunks = chunker.chunk_document(document)
            
            # Verify chunking
            self.assertIsNotNone(chunks)
            self.assertGreater(len(chunks), 0)
            
            logger.info("Semantic Chunker test passed")
        except Exception as e:
            logger.error(f"Semantic Chunker test failed: {str(e)}")
            raise

    def test_entity_extractor(self):
        """Test entity extractor"""
        logger.info("Testing Entity Extractor...")
        
        try:
            from tools.knowledge_graph.entity_extractor import EntityExtractor
            
            # Initialize entity extractor
            extractor = EntityExtractor()
            
            # Test text
            text = "VANA is a Versatile Agent Network Architecture that uses Vector Search and Knowledge Graph."
            
            # Extract entities
            entities = extractor.extract_entities(text)
            
            # Verify entity extraction
            self.assertIsNotNone(entities)
            
            # Extract relationships
            relationships = extractor.extract_relationships(text)
            
            # Verify relationship extraction
            self.assertIsNotNone(relationships)
            
            logger.info("Entity Extractor test passed")
        except Exception as e:
            logger.error(f"Entity Extractor test failed: {str(e)}")
            raise

    def test_knowledge_graph_manager(self):
        """Test knowledge graph manager"""
        logger.info("Testing Knowledge Graph Manager...")
        
        try:
            from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
            
            # Initialize knowledge graph manager
            kg_manager = KnowledgeGraphManager()
            
            # Check availability
            if not kg_manager.is_available():
                logger.warning("Knowledge Graph is not available. Skipping test.")
                return
            
            # Store entity
            result = kg_manager.store(
                entity_name="VANA_Test",
                entity_type="test",
                observation="This is a test entity for VANA."
            )
            
            # Verify entity storage
            self.assertTrue(result.get("success", False))
            
            # Query entity
            query_result = kg_manager.query("test", "VANA_Test")
            
            # Verify query
            self.assertIn("entities", query_result)
            self.assertGreater(len(query_result.get("entities", [])), 0)
            
            logger.info("Knowledge Graph Manager test passed")
        except Exception as e:
            logger.error(f"Knowledge Graph Manager test failed: {str(e)}")
            raise

    def test_vector_search_client(self):
        """Test vector search client"""
        logger.info("Testing Vector Search Client...")
        
        try:
            from tools.vector_search.vector_search_client import VectorSearchClient
            
            # Initialize vector search client
            vs_client = VectorSearchClient()
            
            # Check availability
            if not vs_client.is_available():
                logger.warning("Vector Search is not available. Skipping test.")
                return
            
            # Add document
            result = vs_client.add_document(
                text="This is a test document for Vector Search.",
                metadata={
                    "source": "test",
                    "doc_id": "test-doc-001"
                }
            )
            
            # Verify document addition
            self.assertTrue(result.get("success", False))
            
            # Search
            search_results = vs_client.search("test document", top_k=1)
            
            # Verify search
            self.assertIsNotNone(search_results)
            self.assertGreater(len(search_results), 0)
            
            logger.info("Vector Search Client test passed")
        except Exception as e:
            logger.error(f"Vector Search Client test failed: {str(e)}")
            raise

    def test_hybrid_search(self):
        """Test hybrid search"""
        logger.info("Testing Hybrid Search...")
        
        try:
            from tools.hybrid_search import HybridSearch
            
            # Initialize hybrid search
            hybrid_search = HybridSearch()
            
            # Search
            results = hybrid_search.search("VANA")
            
            # Verify search
            self.assertIsNotNone(results)
            self.assertIn("combined", results)
            
            # Format results
            formatted = hybrid_search.format_results(results)
            
            # Verify formatting
            self.assertIsNotNone(formatted)
            
            logger.info("Hybrid Search test passed")
        except Exception as e:
            logger.error(f"Hybrid Search test failed: {str(e)}")
            raise

    def test_enhanced_hybrid_search(self):
        """Test enhanced hybrid search"""
        logger.info("Testing Enhanced Hybrid Search...")
        
        try:
            from tools.enhanced_hybrid_search import EnhancedHybridSearch
            from tools.web_search_mock import MockWebSearchClient
            
            # Initialize enhanced hybrid search with mock web search
            web_search_client = MockWebSearchClient()
            hybrid_search = EnhancedHybridSearch(web_search_client=web_search_client)
            
            # Search
            results = hybrid_search.search("VANA")
            
            # Verify search
            self.assertIsNotNone(results)
            self.assertIn("combined", results)
            self.assertIn("web_search", results)
            
            # Format results
            formatted = hybrid_search.format_results(results)
            
            # Verify formatting
            self.assertIsNotNone(formatted)
            
            logger.info("Enhanced Hybrid Search test passed")
        except Exception as e:
            logger.error(f"Enhanced Hybrid Search test failed: {str(e)}")
            raise

    def test_web_search(self):
        """Test web search"""
        logger.info("Testing Web Search...")
        
        try:
            from tools.web_search import WebSearchClient
            
            # Initialize web search client
            web_search = WebSearchClient()
            
            # Check availability
            if not web_search.is_available():
                logger.warning("Web Search is not available. Testing mock web search instead.")
                from tools.web_search_mock import MockWebSearchClient
                web_search = MockWebSearchClient()
            
            # Search
            results = web_search.search("VANA")
            
            # Verify search
            self.assertIsNotNone(results)
            self.assertGreater(len(results), 0)
            
            # Format results
            formatted = web_search.format_results(results)
            
            # Verify formatting
            self.assertIsNotNone(formatted)
            
            logger.info("Web Search test passed")
        except Exception as e:
            logger.error(f"Web Search test failed: {str(e)}")
            raise

    def test_feedback_manager(self):
        """Test feedback manager"""
        logger.info("Testing Feedback Manager...")
        
        try:
            from tools.feedback.feedback_manager import FeedbackManager
            
            # Initialize feedback manager with test directory
            test_dir = os.path.join("tests", "test_data", "feedback")
            feedback_manager = FeedbackManager(feedback_dir=test_dir)
            
            # Store search feedback
            search_result = feedback_manager.store_search_feedback(
                query="Test query",
                results=[
                    {"content": "Test result", "score": 0.95}
                ],
                rating=4,
                comment="Test comment",
                user_id="test_user"
            )
            
            # Verify search feedback
            self.assertTrue(search_result.get("success", False))
            
            # Store entity feedback
            entity_result = feedback_manager.store_entity_feedback(
                entity_name="Test entity",
                entity_type="test",
                extracted_data={
                    "name": "Test entity",
                    "type": "test"
                },
                is_correct=True,
                comment="Test comment",
                user_id="test_user"
            )
            
            # Verify entity feedback
            self.assertTrue(entity_result.get("success", False))
            
            # Get feedback
            feedback = feedback_manager.get_feedback()
            
            # Verify feedback retrieval
            self.assertIsNotNone(feedback)
            self.assertGreater(len(feedback), 0)
            
            # Analyze feedback
            analysis = feedback_manager.analyze_feedback()
            
            # Verify analysis
            self.assertTrue(analysis.get("success", False))
            
            # Get feedback summary
            summary = feedback_manager.get_feedback_summary()
            
            # Verify summary
            self.assertIsNotNone(summary)
            
            logger.info("Feedback Manager test passed")
        except Exception as e:
            logger.error(f"Feedback Manager test failed: {str(e)}")
            raise

    def test_knowledge_base_expansion(self):
        """Test knowledge base expansion"""
        logger.info("Testing Knowledge Base Expansion...")
        
        try:
            # Import the function
            from scripts.expand_knowledge_base import process_directory
            
            # Create test directory
            test_dir = os.path.join("tests", "test_data", "documents")
            
            # Create test document
            test_doc_path = os.path.join(test_dir, "test_doc.md")
            with open(test_doc_path, "w") as f:
                f.write("# Test Document\n\nThis is a test document for knowledge base expansion.")
            
            # Process directory
            result = process_directory(
                directory=test_dir,
                file_types=["md"],
                recursive=False
            )
            
            # Verify processing
            self.assertTrue(result.get("success", False))
            self.assertIn("stats", result)
            self.assertGreater(result["stats"].get("documents_processed", 0), 0)
            
            logger.info("Knowledge Base Expansion test passed")
        except Exception as e:
            logger.error(f"Knowledge Base Expansion test failed: {str(e)}")
            raise

    def test_knowledge_base_evaluation(self):
        """Test knowledge base evaluation"""
        logger.info("Testing Knowledge Base Evaluation...")
        
        try:
            # Import the functions
            from scripts.evaluate_knowledge_base import (
                calculate_precision,
                calculate_recall,
                calculate_f1_score,
                calculate_relevance_scores,
                calculate_ndcg
            )
            
            # Test data
            results = [
                {"content": "VANA is a Versatile Agent Network Architecture."},
                {"content": "Vector Search uses embeddings for semantic search."}
            ]
            expected_keywords = ["VANA", "Versatile", "Agent"]
            
            # Calculate metrics
            precision = calculate_precision(results, expected_keywords)
            recall = calculate_recall(results, expected_keywords)
            f1 = calculate_f1_score(precision, recall)
            relevance_scores = calculate_relevance_scores(results, expected_keywords)
            ndcg = calculate_ndcg(relevance_scores)
            
            # Verify metrics
            self.assertIsNotNone(precision)
            self.assertIsNotNone(recall)
            self.assertIsNotNone(f1)
            self.assertIsNotNone(relevance_scores)
            self.assertIsNotNone(ndcg)
            
            logger.info("Knowledge Base Evaluation test passed")
        except Exception as e:
            logger.error(f"Knowledge Base Evaluation test failed: {str(e)}")
            raise

def run_tests():
    """Run all tests"""
    logger.info("Running VANA Test Suite...")
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestSuite)
    
    # Run tests
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    
    # Log results
    logger.info(f"Tests run: {result.testsRun}")
    logger.info(f"Errors: {len(result.errors)}")
    logger.info(f"Failures: {len(result.failures)}")
    
    # Return success status
    return len(result.errors) == 0 and len(result.failures) == 0

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)

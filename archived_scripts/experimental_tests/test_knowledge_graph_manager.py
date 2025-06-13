#!/usr/bin/env python3
"""
Test script for the Knowledge Graph Manager
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Knowledge Graph Manager
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_knowledge_graph_manager():
    """Test the Knowledge Graph Manager"""
    logger.info("Testing Knowledge Graph Manager...")
    
    # Initialize Knowledge Graph Manager
    kg_manager = KnowledgeGraphManager()
    
    # Check if Knowledge Graph is available
    if not kg_manager.is_available():
        logger.warning("Knowledge Graph is not available. Using mock mode.")
    
    # Test document
    test_document = {
        "doc_id": "doc-001",
        "title": "VANA Project Overview",
        "source": "test",
        "text": """
        VANA is a multi-agent system that uses Vector Search and Knowledge Graph for knowledge retrieval.
        It is built on Google's Agent Development Kit (ADK) and integrates with Vertex AI.
        The system can process documents, extract entities, and answer complex queries.
        """
    }
    
    # Process document
    logger.info("Processing test document...")
    try:
        result = kg_manager.process_document(test_document)
        logger.info(f"Document processing result: {result}")
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        result = {"success": False, "reason": str(e)}
    
    # Extract entities
    logger.info("Extracting entities from test document...")
    entities = kg_manager.extract_entities(test_document["text"])
    
    # Print extracted entities
    logger.info(f"Extracted {len(entities)} entities:")
    for entity in entities:
        logger.info(f"  {entity['name']} ({entity['type']}): confidence={entity.get('confidence', 'N/A')}")
    
    # Link entities
    logger.info("Linking entities...")
    linking_result = kg_manager.link_entities(test_document["text"])
    
    # Print linking result
    logger.info(f"Entity linking result: {linking_result}")
    
    # Infer relationships
    if entities:
        logger.info(f"Inferring relationships for {entities[0]['name']}...")
        try:
            infer_result = kg_manager.infer_relationships(entities[0]['name'])
            logger.info(f"Relationship inference result: {infer_result}")
        except Exception as e:
            logger.error(f"Error inferring relationships: {str(e)}")
    
    # Save test results to output file
    output_file = os.path.join("tests", "test_data", "knowledge_graph_test.json")
    try:
        with open(output_file, "w") as f:
            json.dump({
                "document_processing": result,
                "entities": entities,
                "entity_linking": linking_result
            }, f, indent=2)
        logger.info(f"Saved test results to {output_file}")
    except Exception as e:
        logger.error(f"Error saving test results: {str(e)}")
    
    return result.get("success", False) or len(entities) > 0

def main():
    """Main function"""
    logger.info("Knowledge Graph Manager Test")
    
    # Create test_data directory if it doesn't exist
    os.makedirs(os.path.join("tests", "test_data"), exist_ok=True)
    
    # Test Knowledge Graph Manager
    success = test_knowledge_graph_manager()
    
    if success:
        logger.info("Knowledge Graph Manager test completed successfully!")
        return 0
    else:
        logger.error("Knowledge Graph Manager test failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

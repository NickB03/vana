#!/usr/bin/env python3
"""
Test script for the Feedback Manager
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Feedback Manager
from tools.feedback.feedback_manager import FeedbackManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_feedback_manager():
    """Test the Feedback Manager"""
    logger.info("Testing Feedback Manager...")
    
    # Initialize Feedback Manager with test directory
    test_dir = os.path.join("tests", "test_data", "feedback")
    os.makedirs(test_dir, exist_ok=True)
    
    feedback_manager = FeedbackManager(feedback_dir=test_dir)
    
    # Test search feedback
    logger.info("Testing search feedback...")
    search_result = feedback_manager.store_search_feedback(
        query="What is VANA?",
        results=[
            {"content": "VANA is a Versatile Agent Network Architecture", "score": 0.95},
            {"content": "VANA uses Vector Search and Knowledge Graph", "score": 0.85}
        ],
        rating=4,
        comment="Good results, but missing some details",
        user_id="test_user"
    )
    
    logger.info(f"Search feedback result: {search_result}")
    
    # Test entity feedback
    logger.info("Testing entity feedback...")
    entity_result = feedback_manager.store_entity_feedback(
        entity_name="VANA",
        entity_type="project",
        extracted_data={
            "name": "VANA",
            "type": "project",
            "observation": "VANA is a multi-agent system"
        },
        is_correct=True,
        comment="Correct extraction",
        user_id="test_user"
    )
    
    logger.info(f"Entity feedback result: {entity_result}")
    
    # Test document feedback
    logger.info("Testing document feedback...")
    document_result = feedback_manager.store_document_feedback(
        document_id="doc-001",
        processing_result={
            "entities_extracted": 5,
            "entities_stored": 4,
            "chunks": 3
        },
        rating=5,
        comment="Excellent document processing",
        user_id="test_user"
    )
    
    logger.info(f"Document feedback result: {document_result}")
    
    # Test general feedback
    logger.info("Testing general feedback...")
    general_result = feedback_manager.store_general_feedback(
        category="usability",
        content="The system is easy to use but could be more intuitive",
        rating=3,
        user_id="test_user"
    )
    
    logger.info(f"General feedback result: {general_result}")
    
    # Test getting feedback
    logger.info("Testing get_feedback...")
    feedback = feedback_manager.get_feedback()
    
    logger.info(f"Retrieved {len(feedback)} feedback records")
    
    # Test analyzing feedback
    logger.info("Testing analyze_feedback...")
    analysis_result = feedback_manager.analyze_feedback()
    
    logger.info(f"Feedback analysis result: {analysis_result}")
    
    # Test feedback summary
    logger.info("Testing get_feedback_summary...")
    summary = feedback_manager.get_feedback_summary()
    
    logger.info(f"Feedback summary:\n{summary}")
    
    return True

def main():
    """Main function"""
    logger.info("Feedback Manager Test")
    
    # Create test_data directory if it doesn't exist
    os.makedirs(os.path.join("tests", "test_data"), exist_ok=True)
    
    # Test Feedback Manager
    success = test_feedback_manager()
    
    if success:
        logger.info("Feedback Manager test completed successfully!")
        return 0
    else:
        logger.error("Feedback Manager test failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

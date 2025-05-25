#!/usr/bin/env python3
"""
Test script for the document processor
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import document processor
from tools.document_processing.document_processor import DocumentProcessor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_document_processor():
    """Test the document processor"""
    logger.info("Testing document processor...")
    
    # Initialize document processor
    processor = DocumentProcessor()
    
    # Test processing a markdown document
    md_file = os.path.join("tests", "test_data", "sample_document.md")
    if not os.path.exists(md_file):
        logger.error(f"Test file not found: {md_file}")
        return False
    
    logger.info(f"Processing markdown file: {md_file}")
    md_document = processor.process_document(
        file_path=md_file,
        metadata={
            "source": "test",
            "title": "VANA Project Overview"
        }
    )
    
    # Print document metadata
    logger.info("Document metadata:")
    for key, value in md_document.get("metadata", {}).items():
        logger.info(f"  {key}: {value}")
    
    # Print document chunks
    chunks = md_document.get("chunks", [])
    logger.info(f"Document chunks: {len(chunks)}")
    for i, chunk in enumerate(chunks):
        logger.info(f"Chunk {i+1}:")
        logger.info(f"  Text length: {len(chunk.get('text', ''))}")
        logger.info(f"  Token count: {chunk.get('metadata', {}).get('token_count', 0)}")
        logger.info(f"  Section: {chunk.get('metadata', {}).get('heading', '')}")
    
    # Save processed document to output file
    output_file = os.path.join("tests", "test_data", "processed_document.json")
    try:
        with open(output_file, "w") as f:
            json.dump(md_document, f, indent=2)
        logger.info(f"Saved processed document to {output_file}")
    except Exception as e:
        logger.error(f"Error saving processed document: {str(e)}")
    
    return True

def main():
    """Main function"""
    logger.info("Document Processor Test")
    
    # Create test_data directory if it doesn't exist
    os.makedirs(os.path.join("tests", "test_data"), exist_ok=True)
    
    # Test document processor
    success = test_document_processor()
    
    if success:
        logger.info("Document processor test completed successfully!")
        return 0
    else:
        logger.error("Document processor test failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

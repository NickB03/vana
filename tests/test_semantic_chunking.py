#!/usr/bin/env python3
"""
Test Semantic Chunking for VANA

This script tests the semantic chunking functionality for document processing.
"""

import logging
import os
import sys

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the SemanticChunker
from tools.document_processing.semantic_chunker import SemanticChunker

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def test_semantic_chunking():
    """Test the semantic chunking functionality"""
    # Initialize the semantic chunker
    chunker = SemanticChunker(
        target_chunk_size=1000,  # Smaller for testing
        min_chunk_size=200,
        overlap_size=100,
    )

    # Create a test document
    test_document = {
        "doc_id": "test-doc-001",
        "source": "test-source",
        "title": "Test Document",
        "text": """
# Introduction

This is a test document for semantic chunking. It contains multiple sections with headings.

The semantic chunker should be able to extract these sections and chunk them appropriately.

# Section 1: Basic Concepts

## Subsection 1.1: What is Semantic Chunking?

Semantic chunking is the process of dividing a document into meaningful chunks that preserve
the semantic structure of the document. This is important for knowledge retrieval systems
that need to understand the context of a document.

Semantic chunking differs from simple text splitting in that it takes into account the
structure of the document, such as headings, paragraphs, and other semantic elements.

## Subsection 1.2: Why is Semantic Chunking Important?

Semantic chunking is important for several reasons:

1. It preserves the context of the document
2. It allows for more accurate knowledge retrieval
3. It enables better understanding of the document structure
4. It improves the quality of embeddings for vector search

# Section 2: Implementation

## Subsection 2.1: How to Implement Semantic Chunking

Implementing semantic chunking involves several steps:

1. Parse the document to identify headings and sections
2. Extract the sections and their hierarchical structure
3. Split the sections into chunks of appropriate size
4. Ensure that chunks do not cross semantic boundaries
5. Add metadata to each chunk to preserve context

## Subsection 2.2: Challenges and Solutions

There are several challenges in implementing semantic chunking:

- Identifying the correct semantic boundaries
- Balancing chunk size with semantic coherence
- Handling documents with irregular structure
- Preserving context across chunks

Solutions to these challenges include:

- Using regular expressions to identify headings and sections
- Implementing a hierarchical chunking strategy
- Adding overlap between chunks to preserve context
- Including metadata with each chunk to track its position in the document

# Conclusion

Semantic chunking is a powerful technique for document processing in knowledge retrieval systems.
By preserving the semantic structure of documents, it enables more accurate and contextually
relevant retrieval of information.
        """,
    }

    # Extract sections
    logger.info("Extracting sections from test document...")
    sections = chunker.extract_sections(test_document)

    logger.info(f"Found {len(sections)} sections:")
    for i, section in enumerate(sections, 1):
        logger.info(f"{i}. {section.get('heading')} (Path: {section.get('path')})")
        logger.info(f"   Text length: {len(section.get('text'))}")

    # Chunk the document
    logger.info("\nChunking the document...")
    chunks = chunker.chunk_document(test_document)

    logger.info(f"Created {len(chunks)} chunks:")
    for i, chunk in enumerate(chunks, 1):
        logger.info(f"{i}. Chunk {chunk.get('metadata', {}).get('chunk_id')}")
        logger.info(f"   Section: {chunk.get('metadata', {}).get('heading')}")
        logger.info(f"   Path: {chunk.get('metadata', {}).get('section_path')}")
        logger.info(f"   Token count: {chunk.get('metadata', {}).get('token_count')}")
        logger.info(f"   Text length: {len(chunk.get('text'))}")
        logger.info(f"   First 100 chars: {chunk.get('text')[:100]}...")
        logger.info("")

    return True


def main():
    """Main function"""
    logger.info("Testing Semantic Chunking for VANA")

    success = test_semantic_chunking()

    if success:
        logger.info("Semantic chunking test completed successfully!")
        return 0
    else:
        logger.error("Semantic chunking test failed.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

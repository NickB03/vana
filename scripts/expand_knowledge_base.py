#!/usr/bin/env python3
"""
Expand Knowledge Base Script

This script processes documents in a directory and adds them to the Knowledge Base.
It extracts entities and relationships from the documents and stores them in the
Knowledge Graph, and also adds the documents to Vector Search.
"""

import os
import sys
import argparse
import logging
import json
from typing import List, Dict, Any, Optional

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import tools
from tools.document_processing.document_processor import DocumentProcessor
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("expand_knowledge_base.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def process_directory(directory: str, 
                     file_types: List[str] = None, 
                     recursive: bool = True,
                     add_to_vector_search: bool = True,
                     add_to_knowledge_graph: bool = True) -> Dict[str, Any]:
    """
    Process all documents in a directory
    
    Args:
        directory: Directory to process
        file_types: List of file types to process (e.g., ["pdf", "txt", "md"])
        recursive: Whether to process subdirectories
        add_to_vector_search: Whether to add documents to Vector Search
        add_to_knowledge_graph: Whether to add documents to Knowledge Graph
        
    Returns:
        Processing statistics
    """
    if not os.path.exists(directory):
        logger.error(f"Directory not found: {directory}")
        return {"success": False, "reason": "Directory not found"}
    
    # Set default file types if not provided
    if not file_types:
        file_types = ["pdf", "txt", "md", "markdown"]
    
    # Initialize tools
    document_processor = DocumentProcessor()
    kg_manager = KnowledgeGraphManager()
    vs_client = VectorSearchClient()
    
    # Check if tools are available
    if add_to_knowledge_graph and not kg_manager.is_available():
        logger.warning("Knowledge Graph is not available. Documents will not be added to Knowledge Graph.")
        add_to_knowledge_graph = False
    
    if add_to_vector_search and not vs_client.is_available():
        logger.warning("Vector Search is not available. Documents will not be added to Vector Search.")
        add_to_vector_search = False
    
    # Initialize statistics
    stats = {
        "documents_processed": 0,
        "documents_failed": 0,
        "chunks_created": 0,
        "entities_extracted": 0,
        "entities_stored": 0,
        "relationships_extracted": 0,
        "relationships_stored": 0,
        "chunks_added_to_vector_search": 0
    }
    
    # Get all files in the directory
    files = []
    if recursive:
        for root, _, filenames in os.walk(directory):
            for filename in filenames:
                file_ext = os.path.splitext(filename)[1].lower().lstrip('.')
                if file_ext in file_types:
                    files.append(os.path.join(root, filename))
    else:
        for filename in os.listdir(directory):
            file_ext = os.path.splitext(filename)[1].lower().lstrip('.')
            if file_ext in file_types:
                files.append(os.path.join(directory, filename))
    
    logger.info(f"Found {len(files)} files to process in {directory}")
    
    # Process each file
    for file_path in files:
        try:
            logger.info(f"Processing {file_path}")
            
            # Process document
            document = document_processor.process_document(
                file_path=file_path,
                metadata={
                    "source": os.path.relpath(file_path, directory),
                    "doc_id": f"doc-{os.path.basename(file_path)}"
                }
            )
            
            # Get document information
            doc_id = document.get("doc_id", "unknown")
            title = document.get("title", os.path.basename(file_path))
            chunks = document.get("chunks", [])
            
            logger.info(f"Document '{title}' processed with {len(chunks)} chunks")
            stats["documents_processed"] += 1
            stats["chunks_created"] += len(chunks)
            
            # Add to Knowledge Graph
            if add_to_knowledge_graph:
                try:
                    # Process document with Knowledge Graph
                    kg_result = kg_manager.process_document(document)
                    
                    # Update statistics
                    stats["entities_extracted"] += kg_result.get("entities_extracted", 0)
                    stats["entities_stored"] += kg_result.get("entities_stored", 0)
                    stats["relationships_extracted"] += kg_result.get("relationships_extracted", 0)
                    stats["relationships_stored"] += kg_result.get("relationships_stored", 0)
                    
                    logger.info(f"Added document '{title}' to Knowledge Graph")
                except Exception as e:
                    logger.error(f"Error adding document to Knowledge Graph: {str(e)}")
            
            # Add to Vector Search
            if add_to_vector_search:
                try:
                    # Add each chunk to Vector Search
                    for chunk in chunks:
                        chunk_text = chunk.get("text", "")
                        chunk_metadata = chunk.get("metadata", {})
                        
                        # Add chunk to Vector Search
                        result = vs_client.add_document(
                            text=chunk_text,
                            metadata=chunk_metadata
                        )
                        
                        if result.get("success", False):
                            stats["chunks_added_to_vector_search"] += 1
                    
                    logger.info(f"Added {len(chunks)} chunks from document '{title}' to Vector Search")
                except Exception as e:
                    logger.error(f"Error adding document to Vector Search: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            stats["documents_failed"] += 1
    
    # Calculate success rate
    total_documents = stats["documents_processed"] + stats["documents_failed"]
    if total_documents > 0:
        stats["success_rate"] = stats["documents_processed"] / total_documents
    else:
        stats["success_rate"] = 0
    
    # Log summary
    logger.info(f"Processed {stats['documents_processed']} documents ({stats['documents_failed']} failed)")
    logger.info(f"Created {stats['chunks_created']} chunks")
    logger.info(f"Extracted {stats['entities_extracted']} entities and stored {stats['entities_stored']}")
    logger.info(f"Extracted {stats['relationships_extracted']} relationships and stored {stats['relationships_stored']}")
    logger.info(f"Added {stats['chunks_added_to_vector_search']} chunks to Vector Search")
    
    return {"success": True, "stats": stats}

def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Expand Knowledge Base")
    parser.add_argument("directory", help="Directory containing documents to process")
    parser.add_argument("--file-types", nargs="+", default=["pdf", "txt", "md", "markdown"],
                        help="File types to process (default: pdf, txt, md, markdown)")
    parser.add_argument("--recursive", action="store_true", help="Process subdirectories")
    parser.add_argument("--no-vector-search", action="store_true", help="Don't add documents to Vector Search")
    parser.add_argument("--no-knowledge-graph", action="store_true", help="Don't add documents to Knowledge Graph")
    parser.add_argument("--output", help="Output file for processing statistics")
    
    args = parser.parse_args()
    
    # Process directory
    result = process_directory(
        directory=args.directory,
        file_types=args.file_types,
        recursive=args.recursive,
        add_to_vector_search=not args.no_vector_search,
        add_to_knowledge_graph=not args.no_knowledge_graph
    )
    
    # Save statistics to output file if specified
    if args.output and result.get("success", False):
        try:
            with open(args.output, "w") as f:
                json.dump(result.get("stats", {}), f, indent=2)
            logger.info(f"Saved statistics to {args.output}")
        except Exception as e:
            logger.error(f"Error saving statistics to {args.output}: {str(e)}")
    
    # Return success status
    return 0 if result.get("success", False) else 1

if __name__ == "__main__":
    sys.exit(main())

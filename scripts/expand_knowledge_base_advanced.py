#!/usr/bin/env python3
"""
Advanced Knowledge Base Expansion Script

This script provides enhanced functionality for expanding VANA's knowledge base
with improved document processing, entity extraction, and evaluation.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import necessary tools
try:
    from tools.document_processing.document_processor import DocumentProcessor
    from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
    from tools.vector_search.vector_search_client import VectorSearchClient
except ImportError as e:
    logger.warning(f"Could not import some tools: {e}")


def process_document_advanced(
    file_path: str,
    document_processor: DocumentProcessor,
    vs_client: VectorSearchClient,
    kg_manager: KnowledgeGraphManager,
    extract_entities: bool = True,
    add_to_vector_search: bool = True,
    add_to_knowledge_graph: bool = True,
) -> Dict[str, Any]:
    """
    Process a document with advanced features

    Args:
        file_path: Path to the document
        document_processor: Document processor
        vs_client: Vector Search client
        kg_manager: Knowledge Graph manager
        extract_entities: Whether to extract entities
        add_to_vector_search: Whether to add to Vector Search
        add_to_knowledge_graph: Whether to add to Knowledge Graph

    Returns:
        Processing results
    """
    try:
        logger.info(f"Processing {file_path}")

        # Process document
        document = document_processor.process_document(
            file_path=file_path,
            metadata={
                "source": os.path.basename(file_path),
                "doc_id": f"doc-{os.path.basename(file_path)}",
                "processed_date": datetime.now().isoformat(),
            },
        )

        # Get document information
        doc_id = document.get("doc_id", "unknown")
        title = document.get("title", os.path.basename(file_path))
        chunks = document.get("chunks", [])

        logger.info(f"Document '{title}' processed with {len(chunks)} chunks")

        results = {
            "success": True,
            "document": {"doc_id": doc_id, "title": title, "chunk_count": len(chunks)},
            "vector_search": {"chunks_added": 0},
            "knowledge_graph": {
                "entities_extracted": 0,
                "entities_stored": 0,
                "relationships_extracted": 0,
                "relationships_stored": 0,
            },
        }

        # Add to Vector Search
        if add_to_vector_search and vs_client.is_available():
            try:
                for chunk in chunks:
                    vs_client.add_document(text=chunk.get("text", ""), metadata=chunk.get("metadata", {}))

                results["vector_search"]["chunks_added"] = len(chunks)
                logger.info(f"Added {len(chunks)} chunks to Vector Search")
            except Exception as e:
                logger.error(f"Error adding document to Vector Search: {str(e)}")
                results["vector_search"]["error"] = str(e)

        # Add to Knowledge Graph
        if add_to_knowledge_graph and kg_manager.is_available():
            try:
                # Process document with Knowledge Graph
                kg_result = kg_manager.process_document(document)

                # Update results
                results["knowledge_graph"]["entities_extracted"] = kg_result.get("entities_extracted", 0)
                results["knowledge_graph"]["entities_stored"] = kg_result.get("entities_stored", 0)
                results["knowledge_graph"]["relationships_extracted"] = kg_result.get("relationships_extracted", 0)
                results["knowledge_graph"]["relationships_stored"] = kg_result.get("relationships_stored", 0)

                logger.info(f"Added document '{title}' to Knowledge Graph")
                logger.info(
                    f"  Entities: {kg_result.get('entities_stored', 0)}/{kg_result.get('entities_extracted', 0)}"
                )
                logger.info(
                    f"  Relationships: {kg_result.get('relationships_stored', 0)}/{kg_result.get('relationships_extracted', 0)}"
                )
            except Exception as e:
                logger.error(f"Error adding document to Knowledge Graph: {str(e)}")
                results["knowledge_graph"]["error"] = str(e)

        return results

    except Exception as e:
        logger.error(f"Error processing document {file_path}: {str(e)}")
        return {"success": False, "error": str(e)}


def process_directory_advanced(
    directory: str,
    file_types: List[str] = None,
    recursive: bool = True,
    add_to_vector_search: bool = True,
    add_to_knowledge_graph: bool = True,
) -> Dict[str, Any]:
    """
    Process all documents in a directory with advanced features

    Args:
        directory: Directory to process
        file_types: List of file types to process (e.g., ["pd", "txt", "md"])
        recursive: Whether to process subdirectories
        add_to_vector_search: Whether to add documents to Vector Search
        add_to_knowledge_graph: Whether to add documents to Knowledge Graph

    Returns:
        Processing statistics
    """
    if not os.path.exists(directory):
        logger.error(f"Directory not found: {directory}")
        return {"success": False, "reason": "Directory not found"}

    # Initialize components
    document_processor = DocumentProcessor()
    vs_client = VectorSearchClient()
    kg_manager = KnowledgeGraphManager()

    # Check if Vector Search is available
    vs_available = vs_client.is_available()
    if not vs_available and add_to_vector_search:
        logger.warning("Vector Search is not available. Documents will not be added to Vector Search.")
        add_to_vector_search = False

    # Check if Knowledge Graph is available
    kg_available = kg_manager.is_available()
    if not kg_available and add_to_knowledge_graph:
        logger.warning("Knowledge Graph is not available. Documents will not be added to Knowledge Graph.")
        add_to_knowledge_graph = False

    # Set default file types if not provided
    if file_types is None:
        file_types = ["txt", "md", "pd", "html"]

    # Get files to process
    files = []
    if recursive:
        for root, _, filenames in os.walk(directory):
            for filename in filenames:
                if any(filename.lower().endswith(f".{ft.lower()}") for ft in file_types):
                    files.append(os.path.join(root, filename))
    else:
        for filename in os.listdir(directory):
            if any(filename.lower().endswith(f".{ft.lower()}") for ft in file_types):
                files.append(os.path.join(directory, filename))

    logger.info(f"Found {len(files)} files to process")

    # Initialize statistics
    stats = {
        "documents_processed": 0,
        "documents_failed": 0,
        "chunks_created": 0,
        "chunks_added_to_vector_search": 0,
        "entities_extracted": 0,
        "entities_stored": 0,
        "relationships_extracted": 0,
        "relationships_stored": 0,
    }

    # Process each file
    for file_path in files:
        try:
            # Process document
            result = process_document_advanced(
                file_path=file_path,
                document_processor=document_processor,
                vs_client=vs_client,
                kg_manager=kg_manager,
                extract_entities=True,
                add_to_vector_search=add_to_vector_search,
                add_to_knowledge_graph=add_to_knowledge_graph,
            )

            if result.get("success", False):
                # Update statistics
                stats["documents_processed"] += 1
                stats["chunks_created"] += result["document"]["chunk_count"]
                stats["chunks_added_to_vector_search"] += result["vector_search"].get("chunks_added", 0)
                stats["entities_extracted"] += result["knowledge_graph"].get("entities_extracted", 0)
                stats["entities_stored"] += result["knowledge_graph"].get("entities_stored", 0)
                stats["relationships_extracted"] += result["knowledge_graph"].get("relationships_extracted", 0)
                stats["relationships_stored"] += result["knowledge_graph"].get("relationships_stored", 0)
            else:
                stats["documents_failed"] += 1

        except Exception as e:
            logger.error(f"Error processing {file_path}: {str(e)}")
            stats["documents_failed"] += 1

    logger.info("\nProcessing Statistics:")
    logger.info(f"  Documents Processed: {stats['documents_processed']}")
    logger.info(f"  Documents Failed: {stats['documents_failed']}")
    logger.info(f"  Chunks Created: {stats['chunks_created']}")
    logger.info(f"  Chunks Added to Vector Search: {stats['chunks_added_to_vector_search']}")
    logger.info(f"  Entities Extracted: {stats['entities_extracted']}")
    logger.info(f"  Entities Stored: {stats['entities_stored']}")
    logger.info(f"  Relationships Extracted: {stats['relationships_extracted']}")
    logger.info(f"  Relationships Stored: {stats['relationships_stored']}")

    return {"success": True, "stats": stats}


def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Advanced Knowledge Base Expansion")
    parser.add_argument("--directory", required=True, help="Directory containing documents to process")
    parser.add_argument("--file-types", nargs="+", help="File types to process (e.g., pdf txt md)")
    parser.add_argument("--recursive", action="store_true", help="Process subdirectories")
    parser.add_argument(
        "--no-vector-search",
        action="store_true",
        help="Don't add documents to Vector Search",
    )
    parser.add_argument(
        "--no-knowledge-graph",
        action="store_true",
        help="Don't add documents to Knowledge Graph",
    )
    parser.add_argument("--output", help="Output file for processing statistics")

    args = parser.parse_args()

    # Process directory
    result = process_directory_advanced(
        directory=args.directory,
        file_types=args.file_types,
        recursive=args.recursive,
        add_to_vector_search=not args.no_vector_search,
        add_to_knowledge_graph=not args.no_knowledge_graph,
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

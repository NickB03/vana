#!/usr/bin/env python3
"""
Process Document Diffs Script

This script processes document diffs extracted from Git history and updates
the Knowledge Base with only the changed portions. It supports adding, modifying,
and removing content while maintaining version tracking.

Usage:
    python scripts/process_document_diffs.py --input-dir data/diffs --output-dir data/processed
    python scripts/process_document_diffs.py --input-file data/diffs/document.diff --output-dir data/processed
"""

import os
import sys
import re
import argparse
import logging
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import tools
try:
    from tools.document_processing.document_processor import DocumentProcessor
    from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
    from tools.vector_search.vector_search_client import VectorSearchClient
except ImportError as e:
    print(f"Error importing required modules: {e}")
    print("Make sure you run this script from the project root directory.")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("process_document_diffs.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DiffProcessor:
    """Processor for Git diff files to extract changed portions of documents."""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize the DiffProcessor
        
        Args:
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.document_processor = DocumentProcessor()
        self.kg_manager = KnowledgeGraphManager()
        self.vs_client = VectorSearchClient()
        
        # Check if tools are available
        self.kg_available = self.kg_manager.is_available()
        self.vs_available = self.vs_client.is_available()
        
        if not self.kg_available:
            logger.warning("Knowledge Graph is not available. Changes will not be reflected in Knowledge Graph.")
        
        if not self.vs_available:
            logger.warning("Vector Search is not available. Changes will not be reflected in Vector Search.")
    
    def parse_diff_file(self, diff_file: str) -> Dict[str, Any]:
        """
        Parse a Git diff file to extract added, modified, and removed sections
        
        Args:
            diff_file: Path to the diff file
            
        Returns:
            Dict containing the parsed diff information
        """
        if not os.path.exists(diff_file):
            logger.error(f"Diff file not found: {diff_file}")
            return {
                "success": False,
                "reason": "Diff file not found",
                "file_path": diff_file
            }
        
        try:
            with open(diff_file, "r", encoding="utf-8") as f:
                diff_content = f.read()
            
            # Extract file path
            file_path_match = re.search(r"^--- a/(.*?)$", diff_content, re.MULTILINE)
            if file_path_match:
                file_path = file_path_match.group(1)
            else:
                file_path = os.path.basename(diff_file).replace(".diff", "")
            
            # Extract sections
            sections = []
            current_section = None
            
            for line in diff_content.split("\n"):
                if line.startswith("@@"):
                    # New section
                    match = re.search(r"@@ -(\d+),(\d+) \+(\d+),(\d+) @@", line)
                    if match:
                        old_start, old_count, new_start, new_count = map(int, match.groups())
                        if current_section:
                            sections.append(current_section)
                        
                        current_section = {
                            "old_start": old_start,
                            "old_count": old_count,
                            "new_start": new_start,
                            "new_count": new_count,
                            "content": [],
                            "added": [],
                            "removed": []
                        }
                elif current_section:
                    if line.startswith("+"):
                        # Added line
                        current_section["content"].append(line[1:])
                        current_section["added"].append(line[1:])
                    elif line.startswith("-"):
                        # Removed line
                        current_section["removed"].append(line[1:])
                    elif not line.startswith("\\"):
                        # Context line (ignore "\ No newline at end of file")
                        current_section["content"].append(line)
            
            # Add the last section
            if current_section:
                sections.append(current_section)
            
            return {
                "success": True,
                "file_path": file_path,
                "sections": sections,
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"Error parsing diff file {diff_file}: {str(e)}")
            return {
                "success": False,
                "reason": str(e),
                "file_path": diff_file
            }
    
    def create_chunks_from_diff(self, diff_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Create text chunks from diff data
        
        Args:
            diff_data: Parsed diff data
            
        Returns:
            List of chunks
        """
        if not diff_data.get("success", False):
            return []
        
        file_path = diff_data.get("file_path", "unknown")
        sections = diff_data.get("sections", [])
        timestamp = diff_data.get("timestamp", datetime.now().isoformat())
        
        # Create chunks from added content
        chunks = []
        
        for section_idx, section in enumerate(sections):
            added_content = "\n".join(section.get("added", []))
            removed_content = "\n".join(section.get("removed", []))
            
            if added_content:
                # Process added content into chunks
                added_chunks = self._chunk_text(added_content, self.chunk_size, self.chunk_overlap)
                
                for chunk_idx, chunk_text in enumerate(added_chunks):
                    chunks.append({
                        "text": chunk_text,
                        "metadata": {
                            "source": file_path,
                            "doc_id": f"{os.path.basename(file_path)}-{section_idx}-{chunk_idx}",
                            "section": section_idx,
                            "chunk": chunk_idx,
                            "timestamp": timestamp,
                            "version": "latest",
                            "change_type": "added",
                            "deprecated": False
                        }
                    })
            
            if removed_content:
                # Create a single chunk for removed content (for tracking purposes)
                chunks.append({
                    "text": removed_content,
                    "metadata": {
                        "source": file_path,
                        "doc_id": f"{os.path.basename(file_path)}-{section_idx}-removed",
                        "section": section_idx,
                        "timestamp": timestamp,
                        "version": "deprecated",
                        "change_type": "removed",
                        "deprecated": True
                    }
                })
        
        return chunks
    
    def _chunk_text(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        """
        Split text into chunks with overlap
        
        Args:
            text: Text to chunk
            chunk_size: Maximum chunk size in characters
            chunk_overlap: Overlap between chunks in characters
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        chunks = []
        current_pos = 0
        
        while current_pos < len(text):
            # Get chunk of text
            end_pos = min(current_pos + chunk_size, len(text))
            
            # If we're not at the end, try to find a sensible break point
            if end_pos < len(text):
                # Look for paragraph break
                paragraph_break = text.rfind("\n\n", current_pos, end_pos)
                if paragraph_break != -1 and paragraph_break > current_pos:
                    end_pos = paragraph_break + 2
                else:
                    # Look for line break
                    line_break = text.rfind("\n", current_pos, end_pos)
                    if line_break != -1 and line_break > current_pos:
                        end_pos = line_break + 1
                    else:
                        # Look for sentence break
                        sentence_break = text.rfind(". ", current_pos, end_pos)
                        if sentence_break != -1 and sentence_break > current_pos:
                            end_pos = sentence_break + 2
                        else:
                            # Look for space
                            space = text.rfind(" ", current_pos, end_pos)
                            if space != -1 and space > current_pos:
                                end_pos = space + 1
            
            # Extract chunk
            chunk = text[current_pos:end_pos].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move position with overlap
            current_pos = end_pos - chunk_overlap
            if current_pos < 0 or current_pos >= len(text):
                break
        
        return chunks
    
    def update_knowledge_base(self, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update Knowledge Base with chunks from diff
        
        Args:
            chunks: List of chunks to add
            
        Returns:
            Dict containing update statistics
        """
        stats = {
            "chunks_processed": len(chunks),
            "vector_search_updates": 0,
            "knowledge_graph_updates": 0,
            "entities_extracted": 0,
            "entities_updated": 0,
            "deprecated_chunks": 0
        }
        
        # Process added chunks
        added_chunks = [chunk for chunk in chunks if chunk["metadata"]["change_type"] == "added"]
        removed_chunks = [chunk for chunk in chunks if chunk["metadata"]["change_type"] == "removed"]
        
        # Update Vector Search
        if self.vs_available and added_chunks:
            for chunk in added_chunks:
                try:
                    result = self.vs_client.add_document(
                        text=chunk["text"],
                        metadata=chunk["metadata"]
                    )
                    
                    if result.get("success", False):
                        stats["vector_search_updates"] += 1
                except Exception as e:
                    logger.error(f"Error adding chunk to Vector Search: {str(e)}")
        
        # Update Knowledge Graph
        if self.kg_available:
            for chunk in added_chunks:
                try:
                    # Extract entities from chunk
                    entities = self.kg_manager.extract_entities(chunk["text"])
                    stats["entities_extracted"] += len(entities)
                    
                    # Add entities to Knowledge Graph
                    for entity in entities:
                        entity_result = self.kg_manager.store_entity(
                            name=entity["name"],
                            entity_type=entity["type"],
                            observation=entity["text"],
                            metadata={
                                "source": chunk["metadata"]["source"],
                                "timestamp": chunk["metadata"]["timestamp"],
                                "version": chunk["metadata"]["version"]
                            }
                        )
                        
                        if entity_result.get("success", False):
                            stats["entities_updated"] += 1
                except Exception as e:
                    logger.error(f"Error processing entities for Knowledge Graph: {str(e)}")
        
        # Handle deprecated chunks
        stats["deprecated_chunks"] = len(removed_chunks)
        
        # Log statistics
        logger.info(f"Processed {stats['chunks_processed']} chunks: {len(added_chunks)} added, {len(removed_chunks)} removed")
        logger.info(f"Updated {stats['vector_search_updates']} chunks in Vector Search")
        logger.info(f"Extracted {stats['entities_extracted']} entities and updated {stats['entities_updated']} in Knowledge Graph")
        
        return stats
    
    def process_diff(self, diff_file: str) -> Dict[str, Any]:
        """
        Process a diff file and update knowledge base
        
        Args:
            diff_file: Path to the diff file
            
        Returns:
            Dict containing processing statistics
        """
        # Parse diff file
        diff_data = self.parse_diff_file(diff_file)
        
        if not diff_data.get("success", False):
            return {
                "success": False,
                "reason": diff_data.get("reason", "Unknown error"),
                "file_path": diff_data.get("file_path", diff_file)
            }
        
        # Create chunks from diff
        chunks = self.create_chunks_from_diff(diff_data)
        
        if not chunks:
            logger.info(f"No significant changes found in {diff_file}")
            return {
                "success": True,
                "file_path": diff_data.get("file_path", diff_file),
                "chunks": 0,
                "message": "No significant changes found"
            }
        
        # Update knowledge base
        update_stats = self.update_knowledge_base(chunks)
        
        return {
            "success": True,
            "file_path": diff_data.get("file_path", diff_file),
            "chunks": len(chunks),
            "stats": update_stats
        }
    
    def process_directory(self, directory: str) -> Dict[str, Any]:
        """
        Process all diff files in a directory
        
        Args:
            directory: Path to directory containing diff files
            
        Returns:
            Dict containing processing statistics
        """
        if not os.path.exists(directory):
            logger.error(f"Directory not found: {directory}")
            return {
                "success": False,
                "reason": "Directory not found",
                "directory": directory
            }
        
        # Find all diff files
        diff_files = []
        for file in os.listdir(directory):
            if file.endswith(".diff"):
                diff_files.append(os.path.join(directory, file))
        
        logger.info(f"Found {len(diff_files)} diff files in {directory}")
        
        # Process each diff file
        results = []
        for diff_file in diff_files:
            result = self.process_diff(diff_file)
            results.append(result)
        
        # Collect statistics
        total_chunks = sum(result.get("chunks", 0) for result in results if result.get("success", False))
        successful = sum(1 for result in results if result.get("success", False))
        failed = len(results) - successful
        
        return {
            "success": True,
            "directory": directory,
            "total_files": len(diff_files),
            "successful": successful,
            "failed": failed,
            "total_chunks": total_chunks,
            "results": results
        }

def main():
    """Main function"""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Process document diffs")
    parser.add_argument("--input-file", help="Path to the diff file")
    parser.add_argument("--input-dir", help="Path to the directory containing diff files")
    parser.add_argument("--output-dir", help="Output directory for processed documents")
    parser.add_argument("--chunk-size", type=int, default=500, help="Maximum chunk size in characters")
    parser.add_argument("--chunk-overlap", type=int, default=50, help="Overlap between chunks in characters")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    
    args = parser.parse_args()
    
    if not args.input_file and not args.input_dir:
        logger.error("Either --input-file or --input-dir must be specified")
        parser.print_help()
        return 1
    
    # Initialize diff processor
    diff_processor = DiffProcessor(
        chunk_size=args.chunk_size,
        chunk_overlap=args.chunk_overlap
    )
    
    # Process diff
    if args.input_file:
        logger.info(f"Processing diff file: {args.input_file}")
        result = diff_processor.process_diff(args.input_file)
    else:
        logger.info(f"Processing diff files in directory: {args.input_dir}")
        result = diff_processor.process_directory(args.input_dir)
    
    # Save result
    if args.output_dir:
        os.makedirs(args.output_dir, exist_ok=True)
        output_file = os.path.join(args.output_dir, "diff_processing_result.json")
        
        with open(output_file, "w") as f:
            json.dump(result, f, indent=2)
        
        logger.info(f"Result saved to {output_file}")
    
    # Print summary
    if result.get("success", False):
        if args.input_file:
            logger.info(f"Successfully processed diff file: {args.input_file}")
            logger.info(f"Chunks: {result.get('chunks', 0)}")
        else:
            logger.info(f"Successfully processed {result.get('successful', 0)}/{result.get('total_files', 0)} diff files")
            logger.info(f"Total chunks: {result.get('total_chunks', 0)}")
        
        return 0
    else:
        logger.error(f"Error processing diff: {result.get('reason', 'Unknown error')}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

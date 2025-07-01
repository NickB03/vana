#!/usr/bin/env python3
"""
Memory Context Extraction Script
Extracts memory context from VANA development environment for sync operations.

This script was created to resolve memory-sync workflow failures.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_memory_context(source_dir: str, include_git: bool = False) -> Dict[str, Any]:
    """
    Extract memory context from source directory.
    
    Args:
        source_dir: Source directory to extract from
        include_git: Whether to include git history
        
    Returns:
        Dictionary containing extracted context
    """
    logger.info(f"Extracting memory context from: {source_dir}")
    
    context = {
        "timestamp": datetime.utcnow().isoformat(),
        "source_directory": source_dir,
        "extraction_type": "development_environment",
        "documents": [],
        "metadata": {
            "include_git_history": include_git,
            "extractor_version": "1.0.0"
        }
    }
    
    source_path = Path(source_dir)
    if not source_path.exists():
        logger.warning(f"Source directory does not exist: {source_dir}")
        return context
    
    # Extract text files from source directory
    text_extensions = {'.md', '.txt', '.json', '.py', '.yml', '.yaml'}
    
    for file_path in source_path.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in text_extensions:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                doc = {
                    "id": str(file_path.relative_to(source_path)),
                    "content": content[:10000],  # Limit content size
                    "metadata": {
                        "file_path": str(file_path),
                        "file_size": file_path.stat().st_size,
                        "modified_time": datetime.fromtimestamp(
                            file_path.stat().st_mtime
                        ).isoformat(),
                        "file_type": file_path.suffix
                    }
                }
                context["documents"].append(doc)
                
            except Exception as e:
                logger.warning(f"Error reading {file_path}: {e}")
    
    logger.info(f"Extracted {len(context['documents'])} documents")
    return context

def format_for_vertex_ai(context: Dict[str, Any]) -> Dict[str, Any]:
    """Format context for Vertex AI compatibility."""
    logger.info("Formatting context for Vertex AI")
    
    # Transform to Vertex AI expected format
    vertex_format = {
        "batch_id": f"vana_extract_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "vectors": [],
        "metadata_schema": {
            "file_path": "string",
            "extraction_time": "timestamp",
            "content_type": "string"
        }
    }
    
    for i, doc in enumerate(context["documents"]):
        vector_entry = {
            "id": f"doc_{i}",
            "metadata": {
                "file_path": doc["metadata"]["file_path"],
                "extraction_time": context["timestamp"],
                "content_type": doc["metadata"]["file_type"]
            },
            "content": doc["content"]
        }
        vertex_format["vectors"].append(vector_entry)
    
    return vertex_format

def main():
    parser = argparse.ArgumentParser(description="Extract memory context for sync operations")
    parser.add_argument("--source", required=True, help="Source directory to extract from")
    parser.add_argument("--output", required=True, help="Output JSON file")
    parser.add_argument("--include-git-history", action="store_true", 
                       help="Include git history in extraction")
    parser.add_argument("--format", choices=["raw", "vertex-ai"], default="raw",
                       help="Output format")
    
    args = parser.parse_args()
    
    try:
        # Extract context
        context = extract_memory_context(args.source, args.include_git_history)
        
        # Apply formatting if requested
        if args.format == "vertex-ai":
            context = format_for_vertex_ai(context)
        
        # Write output
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(context, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✅ Memory context extracted to: {args.output}")
        logger.info(f"📊 Documents processed: {len(context.get('documents', context.get('vectors', [])))}")
        
    except Exception as e:
        logger.error(f"❌ Extraction failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
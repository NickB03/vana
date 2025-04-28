#!/usr/bin/env python3
"""
Document Processing Tools for VANA Agents

This module provides document processing tools for VANA agents, including:
1. Document processing with PDF support and metadata extraction
2. Semantic chunking for better knowledge retrieval
3. Entity extraction from documents
4. Knowledge Graph integration
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional, Union
from google.adk.tools import FunctionTool

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# Import document processing tools
from tools.document_processing.document_processor import DocumentProcessor
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
document_processor = DocumentProcessor()
kg_manager = KnowledgeGraphManager()

def process_document(file_path: str, extract_entities: bool = True) -> str:
    """
    Process a document and extract information.
    
    Args:
        file_path: Path to the document file
        extract_entities: Whether to extract entities and store in Knowledge Graph
        
    Returns:
        Summary of document processing results
    """
    try:
        logger.info(f"Processing document: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"
        
        # Determine file type
        file_type = os.path.splitext(file_path)[1].lower().lstrip('.')
        
        # Process document
        document = document_processor.process_document(
            file_path=file_path,
            metadata={
                "source": os.path.basename(file_path),
                "doc_id": f"doc-{os.path.basename(file_path)}"
            }
        )
        
        # Extract document information
        doc_id = document.get("doc_id", "unknown")
        title = document.get("title", os.path.basename(file_path))
        chunks = document.get("chunks", [])
        metadata = document.get("metadata", {})
        
        # Format summary
        summary = f"Document Processing Summary for '{title}':\n\n"
        summary += f"- Document ID: {doc_id}\n"
        summary += f"- File Type: {file_type}\n"
        summary += f"- Chunks: {len(chunks)}\n"
        
        # Add metadata summary
        if metadata:
            summary += "\nMetadata:\n"
            for key, value in metadata.items():
                if isinstance(value, dict):
                    summary += f"- {key}: {len(value)} items\n"
                elif isinstance(value, list):
                    summary += f"- {key}: {', '.join(value[:5])}{'...' if len(value) > 5 else ''}\n"
                else:
                    summary += f"- {key}: {value}\n"
        
        # Extract entities if requested
        if extract_entities:
            # Process document with Knowledge Graph
            kg_result = kg_manager.process_document(document)
            
            # Add entity extraction summary
            summary += "\nEntity Extraction:\n"
            summary += f"- Entities Extracted: {kg_result.get('entities_extracted', 0)}\n"
            summary += f"- Entities Stored: {kg_result.get('entities_stored', 0)}\n"
            summary += f"- Relationships Extracted: {kg_result.get('relationships_extracted', 0)}\n"
            summary += f"- Relationships Stored: {kg_result.get('relationships_stored', 0)}\n"
        
        return summary
    
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return f"Error processing document: {str(e)}"

def extract_entities_from_text(text: str) -> str:
    """
    Extract entities from text and store in Knowledge Graph.
    
    Args:
        text: Text to extract entities from
        
    Returns:
        Summary of entity extraction results
    """
    try:
        logger.info(f"Extracting entities from text: {text[:50]}...")
        
        # Extract entities
        entities = kg_manager.extract_entities(text)
        
        if not entities:
            return "No entities found in the provided text."
        
        # Store entities in Knowledge Graph
        stored_entities = []
        for entity in entities:
            try:
                result = kg_manager.store(
                    entity_name=entity["name"],
                    entity_type=entity["type"],
                    observation=entity.get("observation", "")
                )
                
                if result.get("success", False):
                    stored_entities.append(entity["name"])
            except Exception as e:
                logger.error(f"Error storing entity {entity['name']}: {str(e)}")
        
        # Format summary
        summary = f"Entity Extraction Summary:\n\n"
        summary += f"- Entities Extracted: {len(entities)}\n"
        summary += f"- Entities Stored: {len(stored_entities)}\n\n"
        
        # List extracted entities
        summary += "Extracted Entities:\n"
        for entity in entities:
            summary += f"- {entity['name']} ({entity['type']})\n"
        
        return summary
    
    except Exception as e:
        logger.error(f"Error extracting entities: {str(e)}")
        return f"Error extracting entities: {str(e)}"

def chunk_document(file_path: str, target_size: int = 3000) -> str:
    """
    Chunk a document into semantic chunks.
    
    Args:
        file_path: Path to the document file
        target_size: Target chunk size in tokens
        
    Returns:
        Summary of chunking results
    """
    try:
        logger.info(f"Chunking document: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"
        
        # Process document
        document = document_processor.process_document(
            file_path=file_path,
            metadata={
                "source": os.path.basename(file_path),
                "doc_id": f"doc-{os.path.basename(file_path)}"
            }
        )
        
        # Get chunks
        chunks = document.get("chunks", [])
        
        if not chunks:
            return "No chunks created from the document."
        
        # Format summary
        summary = f"Document Chunking Summary:\n\n"
        summary += f"- Document: {document.get('title', os.path.basename(file_path))}\n"
        summary += f"- Total Chunks: {len(chunks)}\n\n"
        
        # List chunks
        summary += "Chunks:\n"
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get("metadata", {})
            summary += f"{i}. {metadata.get('heading', 'Chunk ' + str(i))}\n"
            summary += f"   - Token Count: {metadata.get('token_count', 'Unknown')}\n"
            summary += f"   - Section: {metadata.get('section_path', 'Unknown')}\n"
        
        return summary
    
    except Exception as e:
        logger.error(f"Error chunking document: {str(e)}")
        return f"Error chunking document: {str(e)}"

def extract_metadata(file_path: str) -> str:
    """
    Extract metadata from a document.
    
    Args:
        file_path: Path to the document file
        
    Returns:
        Formatted metadata
    """
    try:
        logger.info(f"Extracting metadata from: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"
        
        # Process document
        document = document_processor.process_document(
            file_path=file_path,
            metadata={
                "source": os.path.basename(file_path),
                "doc_id": f"doc-{os.path.basename(file_path)}"
            }
        )
        
        # Get metadata
        metadata = document.get("metadata", {})
        
        if not metadata:
            return "No metadata extracted from the document."
        
        # Format metadata
        formatted = f"Metadata for '{document.get('title', os.path.basename(file_path))}':\n\n"
        
        for key, value in metadata.items():
            if isinstance(value, dict):
                formatted += f"{key}:\n"
                for k, v in value.items():
                    formatted += f"  - {k}: {v}\n"
            elif isinstance(value, list):
                formatted += f"{key}: {', '.join(str(v) for v in value[:10])}"
                if len(value) > 10:
                    formatted += "..."
                formatted += "\n"
            else:
                formatted += f"{key}: {value}\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error extracting metadata: {str(e)}")
        return f"Error extracting metadata: {str(e)}"

# Create function tools
process_document_tool = FunctionTool(func=process_document)
extract_entities_from_text_tool = FunctionTool(func=extract_entities_from_text)
chunk_document_tool = FunctionTool(func=chunk_document)
extract_metadata_tool = FunctionTool(func=extract_metadata)

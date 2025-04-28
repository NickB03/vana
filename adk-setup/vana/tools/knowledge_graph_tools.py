#!/usr/bin/env python3
"""
Enhanced Knowledge Graph Tools for VANA Agents

This module provides enhanced Knowledge Graph tools for VANA agents, including:
1. Entity extraction and linking
2. Relationship inference
3. Document processing for Knowledge Graph population
4. Feedback collection and analysis
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List, Optional, Union
from google.adk.tools import FunctionTool

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# Import Knowledge Graph tools
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.knowledge_graph.entity_extractor import EntityExtractor

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
kg_manager = KnowledgeGraphManager()
entity_extractor = EntityExtractor()

def kg_extract_entities(text: str) -> str:
    """
    Extract entities from text.
    
    Args:
        text: Text to extract entities from
        
    Returns:
        Formatted list of extracted entities
    """
    try:
        logger.info(f"Extracting entities from text: {text[:50]}...")
        
        # Extract entities
        entities = kg_manager.extract_entities(text)
        
        if not entities:
            return "No entities found in the provided text."
        
        # Format results
        formatted = f"Extracted {len(entities)} entities:\n\n"
        
        for i, entity in enumerate(entities, 1):
            name = entity.get("name", "Unknown")
            entity_type = entity.get("type", "Unknown")
            confidence = entity.get("confidence", "N/A")
            
            formatted += f"{i}. {name} ({entity_type})\n"
            formatted += f"   Confidence: {confidence}\n"
            
            # Add observation if available
            observation = entity.get("observation", "")
            if observation:
                # Truncate long observations
                if len(observation) > 100:
                    observation = observation[:97] + "..."
                formatted += f"   Context: {observation}\n"
            
            formatted += "\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error extracting entities: {str(e)}")
        return f"Error extracting entities: {str(e)}"

def kg_link_entities(text: str) -> str:
    """
    Link entities in text to existing Knowledge Graph entities.
    
    Args:
        text: Text to process for entity linking
        
    Returns:
        Summary of entity linking results
    """
    try:
        logger.info(f"Linking entities in text: {text[:50]}...")
        
        # Link entities
        result = kg_manager.link_entities(text)
        
        if not result.get("success", False):
            return f"Entity linking failed: {result.get('reason', 'Unknown error')}"
        
        # Get linked entities
        linked_entities = result.get("linked_entities", [])
        
        if not linked_entities:
            return "No entities linked in the provided text."
        
        # Format results
        formatted = f"Entity Linking Results:\n\n"
        formatted += f"- Entities Extracted: {result.get('entities_extracted', 0)}\n"
        formatted += f"- Entities Linked: {result.get('entities_linked', 0)}\n\n"
        
        # List linked entities
        formatted += "Linked Entities:\n"
        for entity in linked_entities:
            extracted = entity.get("extracted", "Unknown")
            linked_to = entity.get("linked_to", "None")
            entity_type = entity.get("type", "Unknown")
            action = entity.get("action", "Unknown")
            confidence = entity.get("confidence", "N/A")
            
            if linked_to:
                formatted += f"- {extracted} → {linked_to} ({entity_type})\n"
                formatted += f"  Action: {action}, Confidence: {confidence}\n"
            else:
                formatted += f"- {extracted} ({entity_type})\n"
                formatted += f"  Action: {action}\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error linking entities: {str(e)}")
        return f"Error linking entities: {str(e)}"

def kg_infer_relationships(entity_name: str) -> str:
    """
    Infer relationships for an entity based on Knowledge Graph data.
    
    Args:
        entity_name: Name of the entity to infer relationships for
        
    Returns:
        Summary of inferred relationships
    """
    try:
        logger.info(f"Inferring relationships for entity: {entity_name}")
        
        # Infer relationships
        result = kg_manager.infer_relationships(entity_name)
        
        if not result.get("success", False):
            return f"Relationship inference failed: {result.get('reason', 'Unknown error')}"
        
        # Get inferred relationships
        inferred_relationships = result.get("inferred_relationships", [])
        
        if not inferred_relationships:
            return f"No relationships inferred for entity '{entity_name}'."
        
        # Format results
        formatted = f"Inferred Relationships for '{entity_name}':\n\n"
        formatted += f"- Relationships Inferred: {len(inferred_relationships)}\n"
        formatted += f"- Relationships Stored: {result.get('stored_relationships', 0)}\n\n"
        
        # List inferred relationships
        formatted += "Inferred Relationships:\n"
        for rel in inferred_relationships:
            entity1 = rel.get("entity1", "Unknown")
            relationship = rel.get("relationship", "related_to")
            entity2 = rel.get("entity2", "Unknown")
            confidence = rel.get("confidence", "N/A")
            reason = rel.get("reason", "")
            
            formatted += f"- {entity1} {relationship} {entity2}\n"
            formatted += f"  Confidence: {confidence}\n"
            
            if reason:
                formatted += f"  Reason: {reason}\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error inferring relationships: {str(e)}")
        return f"Error inferring relationships: {str(e)}"

def kg_process_document(file_path: str) -> str:
    """
    Process a document and extract entities and relationships for the Knowledge Graph.
    
    Args:
        file_path: Path to the document file
        
    Returns:
        Summary of document processing results
    """
    try:
        logger.info(f"Processing document for Knowledge Graph: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: File not found at {file_path}"
        
        # Read document
        with open(file_path, 'r', encoding='utf-8') as f:
            text = f.read()
        
        # Create document object
        document = {
            "doc_id": os.path.basename(file_path),
            "title": os.path.basename(file_path),
            "source": "file",
            "text": text
        }
        
        # Process document
        result = kg_manager.process_document(document)
        
        if not result.get("success", False):
            return f"Document processing failed: {result.get('reason', 'Unknown error')}"
        
        # Format results
        formatted = f"Document Processing Results for '{document['title']}':\n\n"
        formatted += f"- Entities Extracted: {result.get('entities_extracted', 0)}\n"
        formatted += f"- Entities Stored: {result.get('entities_stored', 0)}\n"
        formatted += f"- Relationships Extracted: {result.get('relationships_extracted', 0)}\n"
        formatted += f"- Relationships Stored: {result.get('relationships_stored', 0)}\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        return f"Error processing document: {str(e)}"

def kg_store_feedback(entity_name: str, feedback: str, rating: int = 0) -> str:
    """
    Store user feedback about an entity in the Knowledge Graph.
    
    Args:
        entity_name: Name of the entity to store feedback for
        feedback: User feedback text
        rating: Optional rating (0-5)
        
    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing feedback for entity: {entity_name}")
        
        # Validate rating
        if rating < 0 or rating > 5:
            return "Error: Rating must be between 0 and 5."
        
        # Create feedback observation
        observation = f"User Feedback: {feedback}"
        if rating > 0:
            observation += f" (Rating: {rating}/5)"
        
        # Store feedback as an observation
        result = kg_manager.store(
            entity_name=entity_name,
            entity_type="feedback",
            observation=observation
        )
        
        if not result.get("success", False):
            return f"Failed to store feedback: {result.get('reason', 'Unknown error')}"
        
        # Create relationship to the entity
        rel_result = kg_manager.store_relationship(
            entity1="Feedback",
            relationship="about",
            entity2=entity_name
        )
        
        return f"Feedback for '{entity_name}' stored successfully."
    
    except Exception as e:
        logger.error(f"Error storing feedback: {str(e)}")
        return f"Error storing feedback: {str(e)}"

def kg_analyze_feedback(entity_type: str = "*") -> str:
    """
    Analyze feedback stored in the Knowledge Graph.
    
    Args:
        entity_type: Type of entity to analyze feedback for (default: all types)
        
    Returns:
        Feedback analysis summary
    """
    try:
        logger.info(f"Analyzing feedback for entity type: {entity_type}")
        
        # Query feedback entities
        result = kg_manager.query("feedback", "")
        
        if not result.get("entities"):
            return "No feedback found in the Knowledge Graph."
        
        feedback_entities = result.get("entities", [])
        
        # Filter by entity type if specified
        if entity_type != "*":
            # Get entities of the specified type
            type_result = kg_manager.query(entity_type, "")
            type_entities = type_result.get("entities", [])
            type_names = [e.get("name") for e in type_entities]
            
            # Filter feedback related to these entities
            filtered_feedback = []
            for feedback in feedback_entities:
                # Check relationships
                rel_result = kg_manager.query_related(feedback.get("name"), "about")
                related_entities = rel_result.get("entities", [])
                
                if any(e.get("name") in type_names for e in related_entities):
                    filtered_feedback.append(feedback)
            
            feedback_entities = filtered_feedback
        
        if not feedback_entities:
            return f"No feedback found for entity type '{entity_type}'."
        
        # Analyze feedback
        formatted = f"Feedback Analysis Summary:\n\n"
        formatted += f"- Total Feedback: {len(feedback_entities)}\n\n"
        
        # Group feedback by entity
        feedback_by_entity = {}
        for feedback in feedback_entities:
            # Get related entity
            rel_result = kg_manager.query_related(feedback.get("name"), "about")
            related_entities = rel_result.get("entities", [])
            
            for entity in related_entities:
                entity_name = entity.get("name")
                if entity_name not in feedback_by_entity:
                    feedback_by_entity[entity_name] = []
                
                feedback_by_entity[entity_name].append(feedback)
        
        # Format feedback by entity
        formatted += "Feedback by Entity:\n"
        for entity_name, feedbacks in feedback_by_entity.items():
            formatted += f"\n{entity_name} ({len(feedbacks)} feedback items):\n"
            
            for feedback in feedbacks:
                observation = feedback.get("observation", "")
                formatted += f"- {observation}\n"
        
        return formatted
    
    except Exception as e:
        logger.error(f"Error analyzing feedback: {str(e)}")
        return f"Error analyzing feedback: {str(e)}"

# Create function tools
kg_extract_entities_tool = FunctionTool(func=kg_extract_entities)
kg_link_entities_tool = FunctionTool(func=kg_link_entities)
kg_infer_relationships_tool = FunctionTool(func=kg_infer_relationships)
kg_process_document_tool = FunctionTool(func=kg_process_document)
kg_store_feedback_tool = FunctionTool(func=kg_store_feedback)
kg_analyze_feedback_tool = FunctionTool(func=kg_analyze_feedback)

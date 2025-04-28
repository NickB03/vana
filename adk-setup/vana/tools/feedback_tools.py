#!/usr/bin/env python3
"""
Feedback Tools for VANA Agents

This module provides feedback collection and analysis tools for VANA agents.
It allows users to provide feedback on search results, entity extraction,
and other system components, which can be used to improve the system over time.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional
from google.adk.tools import FunctionTool

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

# Import Feedback Manager
from tools.feedback.feedback_manager import FeedbackManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Feedback Manager
feedback_manager = FeedbackManager()

def store_search_feedback(query: str, rating: int, comment: str = "") -> str:
    """
    Store feedback for search results
    
    Args:
        query: Search query
        rating: Rating (1-5)
        comment: User comment
        
    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing search feedback for query: {query}")
        
        # Create minimal results (actual results would be too large)
        results = [{"content": "Search result (simplified for feedback)"}]
        
        # Store feedback
        result = feedback_manager.store_search_feedback(
            query=query,
            results=results,
            rating=rating,
            comment=comment
        )
        
        if result.get("success", False):
            return f"Thank you for your feedback on the search results for '{query}'."
        else:
            return f"Error storing feedback: {result.get('reason', 'Unknown error')}"
    
    except Exception as e:
        logger.error(f"Error storing search feedback: {str(e)}")
        return f"Error storing search feedback: {str(e)}"

def store_entity_feedback(entity_name: str, entity_type: str, is_correct: bool, comment: str = "") -> str:
    """
    Store feedback for entity extraction
    
    Args:
        entity_name: Name of the entity
        entity_type: Type of the entity
        is_correct: Whether the extraction is correct
        comment: User comment
        
    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing entity feedback for {entity_name} ({entity_type})")
        
        # Create minimal extracted data
        extracted_data = {
            "name": entity_name,
            "type": entity_type
        }
        
        # Store feedback
        result = feedback_manager.store_entity_feedback(
            entity_name=entity_name,
            entity_type=entity_type,
            extracted_data=extracted_data,
            is_correct=is_correct,
            comment=comment
        )
        
        if result.get("success", False):
            return f"Thank you for your feedback on the entity '{entity_name}'."
        else:
            return f"Error storing feedback: {result.get('reason', 'Unknown error')}"
    
    except Exception as e:
        logger.error(f"Error storing entity feedback: {str(e)}")
        return f"Error storing entity feedback: {str(e)}"

def store_document_feedback(document_id: str, rating: int, comment: str = "") -> str:
    """
    Store feedback for document processing
    
    Args:
        document_id: Document identifier
        rating: Rating (1-5)
        comment: User comment
        
    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing document feedback for {document_id}")
        
        # Create minimal processing result
        processing_result = {
            "document_id": document_id
        }
        
        # Store feedback
        result = feedback_manager.store_document_feedback(
            document_id=document_id,
            processing_result=processing_result,
            rating=rating,
            comment=comment
        )
        
        if result.get("success", False):
            return f"Thank you for your feedback on the document '{document_id}'."
        else:
            return f"Error storing feedback: {result.get('reason', 'Unknown error')}"
    
    except Exception as e:
        logger.error(f"Error storing document feedback: {str(e)}")
        return f"Error storing document feedback: {str(e)}"

def store_general_feedback(category: str, content: str, rating: int = 0) -> str:
    """
    Store general feedback
    
    Args:
        category: Feedback category
        content: Feedback content
        rating: Optional rating (0-5)
        
    Returns:
        Confirmation message
    """
    try:
        logger.info(f"Storing general feedback for category: {category}")
        
        # Store feedback
        result = feedback_manager.store_general_feedback(
            category=category,
            content=content,
            rating=rating
        )
        
        if result.get("success", False):
            return f"Thank you for your feedback on {category}."
        else:
            return f"Error storing feedback: {result.get('reason', 'Unknown error')}"
    
    except Exception as e:
        logger.error(f"Error storing general feedback: {str(e)}")
        return f"Error storing general feedback: {str(e)}"

def get_feedback_summary() -> str:
    """
    Get a summary of feedback
    
    Returns:
        Formatted feedback summary
    """
    try:
        logger.info("Getting feedback summary")
        
        # Get feedback summary
        summary = feedback_manager.get_feedback_summary()
        
        return summary
    
    except Exception as e:
        logger.error(f"Error getting feedback summary: {str(e)}")
        return f"Error getting feedback summary: {str(e)}"

# Create function tools
store_search_feedback_tool = FunctionTool(func=store_search_feedback)
store_entity_feedback_tool = FunctionTool(func=store_entity_feedback)
store_document_feedback_tool = FunctionTool(func=store_document_feedback)
store_general_feedback_tool = FunctionTool(func=store_general_feedback)
get_feedback_summary_tool = FunctionTool(func=get_feedback_summary)

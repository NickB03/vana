"""
Standardized Knowledge Graph Tools for VANA Multi-Agent System

This module provides standardized knowledge graph tools that follow the
tool standards framework for consistent interfaces, error handling,
and performance monitoring.
"""

import os
import sys
from typing import Dict, Any, List, Union

# Add the parent directory to the path to import VANA tools
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from lib._shared_libraries.tool_standards import (
    StandardToolResponse, InputValidator, ErrorHandler,
    standardized_tool_wrapper, performance_monitor, tool_analytics
)

# Import original knowledge graph tools with fallback to avoid circular imports
try:
    from agent.tools import kg_query, kg_store, kg_relationship, kg_extract_entities
except ImportError:
    # Fallback implementations to avoid circular imports during initialization
    def kg_query(entity_type: str, query_text: str):
        return {"success": False, "error": "Knowledge graph not available during initialization"}

    def kg_store(entity_name: str, entity_type: str, properties: str = ""):
        return {"success": False, "error": "Knowledge graph not available during initialization"}

    def kg_relationship(entity1: str, relationship: str, entity2: str):
        return {"success": False, "error": "Knowledge graph not available during initialization"}

    def kg_extract_entities(text: str):
        return {"success": False, "error": "Knowledge graph not available during initialization"}

class StandardizedKnowledgeGraphTools:
    """Standardized knowledge graph tools with enhanced monitoring and error handling."""

    @standardized_tool_wrapper("kg_query")
    def kg_query(self, entity_type: str, query_text: str) -> StandardToolResponse:
        """🕸️ Query the knowledge graph for entities and relationships.

        Args:
            entity_type: Type of entity to query (e.g., 'person', 'project', 'concept')
            query_text: Query text to search for

        Returns:
            StandardToolResponse with query results or error information
        """
        # Validate inputs
        entity_type = InputValidator.validate_string(entity_type, "entity_type", required=True, min_length=1, max_length=100)
        query_text = InputValidator.validate_string(query_text, "query_text", required=True, min_length=1, max_length=1000)

        # Record usage for analytics
        parameters = {"entity_type": entity_type, "query_text": query_text}

        try:
            # Execute original tool
            results = kg_query(entity_type, query_text)

            # Handle different result formats
            if isinstance(results, dict) and not results.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=results.get("error", "Knowledge graph query failed"),
                    tool_name="kg_query"
                )
            else:
                # Ensure results is a list
                if isinstance(results, str):
                    results = [{"name": results, "type": entity_type}]
                elif not isinstance(results, list):
                    results = []

                response = StandardToolResponse(
                    success=True,
                    data=results,
                    tool_name="kg_query",
                    metadata={
                        "entity_type": entity_type,
                        "query_text": query_text,
                        "result_count": len(results)
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("kg_query", e)

        # Record analytics
        tool_analytics.record_usage("kg_query", parameters, response)
        return response

    @standardized_tool_wrapper("kg_store")
    def kg_store(self, entity_name: str, entity_type: str, properties: str = "") -> StandardToolResponse:
        """💾 Store an entity in the knowledge graph with properties.

        Args:
            entity_name: Name of the entity to store
            entity_type: Type of the entity (e.g., 'person', 'project', 'concept')
            properties: Additional properties or description of the entity

        Returns:
            StandardToolResponse with storage result or error information
        """
        # Validate inputs
        entity_name = InputValidator.validate_string(entity_name, "entity_name", required=True, min_length=1, max_length=200)
        entity_type = InputValidator.validate_string(entity_type, "entity_type", required=True, min_length=1, max_length=100)
        properties = InputValidator.validate_string(properties, "properties", required=False, max_length=2000)

        # Record usage for analytics
        parameters = {"entity_name": entity_name, "entity_type": entity_type, "properties_length": len(properties)}

        try:
            # Execute original tool
            result = kg_store(entity_name, entity_type, properties)

            # Handle different result formats
            if isinstance(result, dict) and not result.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=result.get("error", "Knowledge graph storage failed"),
                    tool_name="kg_store"
                )
            else:
                response = StandardToolResponse(
                    success=True,
                    data={
                        "entity_name": entity_name,
                        "entity_type": entity_type,
                        "stored": True
                    },
                    tool_name="kg_store",
                    metadata={
                        "entity_name": entity_name,
                        "entity_type": entity_type,
                        "properties_length": len(properties)
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("kg_store", e)

        # Record analytics
        tool_analytics.record_usage("kg_store", parameters, response)
        return response

    @standardized_tool_wrapper("kg_relationship")
    def kg_relationship(self, entity1: str, relationship: str, entity2: str) -> StandardToolResponse:
        """🔗 Create a relationship between two entities in the knowledge graph.

        Args:
            entity1: First entity in the relationship
            relationship: Type of relationship (e.g., 'uses', 'contains', 'related_to')
            entity2: Second entity in the relationship

        Returns:
            StandardToolResponse with relationship creation result or error information
        """
        # Validate inputs
        entity1 = InputValidator.validate_string(entity1, "entity1", required=True, min_length=1, max_length=200)
        relationship = InputValidator.validate_string(relationship, "relationship", required=True, min_length=1, max_length=100)
        entity2 = InputValidator.validate_string(entity2, "entity2", required=True, min_length=1, max_length=200)

        # Record usage for analytics
        parameters = {"entity1": entity1, "relationship": relationship, "entity2": entity2}

        try:
            # Execute original tool
            result = kg_relationship(entity1, relationship, entity2)

            # Handle different result formats
            if isinstance(result, dict) and not result.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=result.get("error", "Knowledge graph relationship creation failed"),
                    tool_name="kg_relationship"
                )
            else:
                response = StandardToolResponse(
                    success=True,
                    data={
                        "entity1": entity1,
                        "relationship": relationship,
                        "entity2": entity2,
                        "created": True
                    },
                    tool_name="kg_relationship",
                    metadata={
                        "entity1": entity1,
                        "relationship": relationship,
                        "entity2": entity2
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("kg_relationship", e)

        # Record analytics
        tool_analytics.record_usage("kg_relationship", parameters, response)
        return response

    @standardized_tool_wrapper("kg_extract_entities")
    def kg_extract_entities(self, text: str, store_entities: bool = True) -> StandardToolResponse:
        """🎯 Extract entities from text using NLP and optionally store in knowledge graph.

        Args:
            text: Text to extract entities from
            store_entities: Whether to automatically store extracted entities (default: True)

        Returns:
            StandardToolResponse with extracted entities or error information
        """
        # Validate inputs
        text = InputValidator.validate_string(text, "text", required=True, min_length=1, max_length=10000)

        # Record usage for analytics
        parameters = {"text_length": len(text), "store_entities": store_entities}

        try:
            # Execute original tool
            results = kg_extract_entities(text)

            # Handle different result formats
            if isinstance(results, dict) and not results.get("success", True):
                response = StandardToolResponse(
                    success=False,
                    error=results.get("error", "Entity extraction failed"),
                    tool_name="kg_extract_entities"
                )
            else:
                # Ensure results is a list
                if isinstance(results, str):
                    results = [{"name": results, "type": "UNKNOWN"}]
                elif not isinstance(results, list):
                    results = []

                response = StandardToolResponse(
                    success=True,
                    data=results,
                    tool_name="kg_extract_entities",
                    metadata={
                        "text_length": len(text),
                        "entities_extracted": len(results),
                        "store_entities": store_entities
                    }
                )
        except Exception as e:
            response = ErrorHandler.create_error_response("kg_extract_entities", e)

        # Record analytics
        tool_analytics.record_usage("kg_extract_entities", parameters, response)
        return response

# Create global instance
standardized_kg_tools = StandardizedKnowledgeGraphTools()

# Wrapper functions for ADK compatibility
def standardized_kg_query(entity_type: str, query_text: str) -> str:
    """🕸️ KG query with standardized interface - returns string for ADK compatibility."""
    result = standardized_kg_tools.kg_query(entity_type, query_text)
    return result.to_string()

def standardized_kg_store(entity_name: str, entity_type: str, properties: str = "") -> str:
    """💾 KG store with standardized interface - returns string for ADK compatibility."""
    result = standardized_kg_tools.kg_store(entity_name, entity_type, properties)
    return result.to_string()

def standardized_kg_relationship(entity1: str, relationship: str, entity2: str) -> str:
    """🔗 KG relationship with standardized interface - returns string for ADK compatibility."""
    result = standardized_kg_tools.kg_relationship(entity1, relationship, entity2)
    return result.to_string()

def standardized_kg_extract_entities(text: str, store_entities: bool = True) -> str:
    """🎯 KG entity extraction with standardized interface - returns string for ADK compatibility."""
    result = standardized_kg_tools.kg_extract_entities(text, store_entities)
    return result.to_string()

# Performance monitoring functions
def get_kg_tools_performance() -> Dict[str, Any]:
    """Get performance metrics for knowledge graph tools."""
    return {
        "kg_query": performance_monitor.get_metrics("kg_query"),
        "kg_store": performance_monitor.get_metrics("kg_store"),
        "kg_relationship": performance_monitor.get_metrics("kg_relationship"),
        "kg_extract_entities": performance_monitor.get_metrics("kg_extract_entities")
    }

def get_kg_tools_analytics() -> Dict[str, Any]:
    """Get usage analytics for knowledge graph tools."""
    return {
        "kg_query": tool_analytics.get_usage_analytics("kg_query"),
        "kg_store": tool_analytics.get_usage_analytics("kg_store"),
        "kg_relationship": tool_analytics.get_usage_analytics("kg_relationship"),
        "kg_extract_entities": tool_analytics.get_usage_analytics("kg_extract_entities")
    }

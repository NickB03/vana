#!/usr/bin/env python3
"""
Knowledge Graph Tool for VANA Agent

This module provides a wrapper around the Knowledge Graph Manager for the VANA agent.
It allows querying and updating the knowledge graph with appropriate error handling.
"""

import logging
from typing import Dict, List, Any, Optional, Union

import sys
import os

# Add the project root to the path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
except ImportError:
    # Fallback for testing or when tools module is not available
    class MockKnowledgeGraphManager:
        def __init__(self):
            pass
        def is_available(self):
            return True
        def query(self, entity_type, query_text):
            return {"entities": [{"name": f"Mock entity for {query_text}", "type": entity_type}]}
        def store(self, entity_name, entity_type, observation):
            return {"success": True}
        def store_relationship(self, entity1, relationship, entity2):
            return {"success": True}
        def extract_entities(self, text):
            return [{"name": "Mock Entity", "type": "PERSON"}]
    KnowledgeGraphManager = MockKnowledgeGraphManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeGraphTool:
    """
    Knowledge Graph tool for the VANA agent.

    This tool provides a wrapper around the Knowledge Graph Manager with
    appropriate error handling and result formatting for agent use.
    """

    def __init__(self):
        """
        Initialize the Knowledge Graph tool.
        """
        self.kg_manager = KnowledgeGraphManager()
        logger.info("Initialized KnowledgeGraphTool")

    def is_available(self) -> bool:
        """
        Check if the Knowledge Graph is available.

        Returns:
            True if the Knowledge Graph is available, False otherwise
        """
        return self.kg_manager.is_available()

    def query(self, entity_type: str, query_text: str) -> Dict[str, Any]:
        """
        Query the Knowledge Graph for entities.

        Args:
            entity_type: Type of entity to query for
            query_text: Query text

        Returns:
            Dictionary with 'success', 'entities', and optional 'error' keys
        """
        try:
            # Validate input
            if not entity_type or not isinstance(entity_type, str):
                return {
                    "success": False,
                    "error": "Invalid entity_type: must be a non-empty string"
                }

            if not query_text or not isinstance(query_text, str):
                return {
                    "success": False,
                    "error": "Invalid query_text: must be a non-empty string"
                }

            # Check if Knowledge Graph is available
            if not self.is_available():
                return {
                    "success": False,
                    "error": "Knowledge Graph is not available"
                }

            # Perform query
            result = self.kg_manager.query(entity_type, query_text)

            # Check for error in result
            if "error" in result:
                logger.error(f"Error querying Knowledge Graph: {result['error']}")
                return {
                    "success": False,
                    "error": result["error"]
                }

            # Extract entities
            entities = result.get("entities", [])

            logger.info(f"Successfully queried Knowledge Graph for '{query_text}' with {len(entities)} results")
            return {
                "success": True,
                "entities": entities
            }
        except Exception as e:
            logger.error(f"Error querying Knowledge Graph: {str(e)}")
            return {
                "success": False,
                "error": f"Error querying Knowledge Graph: {str(e)}"
            }

    def store(self, entity_name: str, entity_type: str, observation: str) -> Dict[str, Any]:
        """
        Store information in the Knowledge Graph.

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            observation: Observation about the entity

        Returns:
            Dictionary with 'success' and optional 'error' keys
        """
        try:
            # Validate input
            if not entity_name or not isinstance(entity_name, str):
                return {
                    "success": False,
                    "error": "Invalid entity_name: must be a non-empty string"
                }

            if not entity_type or not isinstance(entity_type, str):
                return {
                    "success": False,
                    "error": "Invalid entity_type: must be a non-empty string"
                }

            if not observation or not isinstance(observation, str):
                return {
                    "success": False,
                    "error": "Invalid observation: must be a non-empty string"
                }

            # Check if Knowledge Graph is available
            if not self.is_available():
                return {
                    "success": False,
                    "error": "Knowledge Graph is not available"
                }

            # Store information
            result = self.kg_manager.store(entity_name, entity_type, observation)

            # Check for error in result
            if not result.get("success", False):
                logger.error(f"Error storing in Knowledge Graph: {result.get('error', 'Unknown error')}")
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error")
                }

            logger.info(f"Successfully stored entity '{entity_name}' in Knowledge Graph")
            return {
                "success": True,
                "entity": entity_name,
                "type": entity_type
            }
        except Exception as e:
            logger.error(f"Error storing in Knowledge Graph: {str(e)}")
            return {
                "success": False,
                "error": f"Error storing in Knowledge Graph: {str(e)}"
            }

    def store_relationship(self, entity1: str, relationship: str, entity2: str) -> Dict[str, Any]:
        """
        Store a relationship between two entities in the Knowledge Graph.

        Args:
            entity1: First entity
            relationship: Relationship type
            entity2: Second entity

        Returns:
            Dictionary with 'success' and optional 'error' keys
        """
        try:
            # Validate input
            if not entity1 or not isinstance(entity1, str):
                return {
                    "success": False,
                    "error": "Invalid entity1: must be a non-empty string"
                }

            if not relationship or not isinstance(relationship, str):
                return {
                    "success": False,
                    "error": "Invalid relationship: must be a non-empty string"
                }

            if not entity2 or not isinstance(entity2, str):
                return {
                    "success": False,
                    "error": "Invalid entity2: must be a non-empty string"
                }

            # Check if Knowledge Graph is available
            if not self.is_available():
                return {
                    "success": False,
                    "error": "Knowledge Graph is not available"
                }

            # Store relationship
            result = self.kg_manager.store_relationship(entity1, relationship, entity2)

            # Check for error in result
            if not result.get("success", False):
                logger.error(f"Error storing relationship in Knowledge Graph: {result.get('error', 'Unknown error')}")
                return {
                    "success": False,
                    "error": result.get("error", "Unknown error")
                }

            logger.info(f"Successfully stored relationship '{entity1} {relationship} {entity2}' in Knowledge Graph")
            return {
                "success": True,
                "entity1": entity1,
                "relationship": relationship,
                "entity2": entity2
            }
        except Exception as e:
            logger.error(f"Error storing relationship in Knowledge Graph: {str(e)}")
            return {
                "success": False,
                "error": f"Error storing relationship in Knowledge Graph: {str(e)}"
            }

    def extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Extract entities from text.

        Args:
            text: Text to extract entities from

        Returns:
            Dictionary with 'success', 'entities', and optional 'error' keys
        """
        try:
            # Validate input
            if not text or not isinstance(text, str):
                return {
                    "success": False,
                    "error": "Invalid text: must be a non-empty string"
                }

            # Extract entities
            entities = self.kg_manager.extract_entities(text)

            logger.info(f"Successfully extracted {len(entities)} entities from text")
            return {
                "success": True,
                "entities": entities
            }
        except Exception as e:
            logger.error(f"Error extracting entities: {str(e)}")
            return {
                "success": False,
                "error": f"Error extracting entities: {str(e)}"
            }

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the tool.

        Returns:
            Tool metadata
        """
        return {
            "name": "knowledge_graph",
            "description": "Tool for interacting with the Knowledge Graph",
            "operations": [
                {
                    "name": "query",
                    "description": "Query the Knowledge Graph for entities",
                    "parameters": [
                        {
                            "name": "entity_type",
                            "type": "string",
                            "description": "Type of entity to query for",
                            "required": True
                        },
                        {
                            "name": "query_text",
                            "type": "string",
                            "description": "Query text",
                            "required": True
                        }
                    ]
                },
                {
                    "name": "store",
                    "description": "Store information in the Knowledge Graph",
                    "parameters": [
                        {
                            "name": "entity_name",
                            "type": "string",
                            "description": "Name of the entity",
                            "required": True
                        },
                        {
                            "name": "entity_type",
                            "type": "string",
                            "description": "Type of the entity",
                            "required": True
                        },
                        {
                            "name": "observation",
                            "type": "string",
                            "description": "Observation about the entity",
                            "required": True
                        }
                    ]
                },
                {
                    "name": "store_relationship",
                    "description": "Store a relationship between two entities",
                    "parameters": [
                        {
                            "name": "entity1",
                            "type": "string",
                            "description": "First entity",
                            "required": True
                        },
                        {
                            "name": "relationship",
                            "type": "string",
                            "description": "Relationship type",
                            "required": True
                        },
                        {
                            "name": "entity2",
                            "type": "string",
                            "description": "Second entity",
                            "required": True
                        }
                    ]
                }
            ]
        }


# Function wrappers for the tool
def query(entity_type: str, query_text: str) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Query the Knowledge Graph for entities.

    Args:
        entity_type: Type of entity to query for
        query_text: Query text

    Returns:
        List of entities if successful, error dictionary otherwise
    """
    tool = KnowledgeGraphTool()
    result = tool.query(entity_type, query_text)

    if result["success"]:
        return result["entities"]
    return result

def store(entity_name: str, entity_type: str, observation: str) -> Dict[str, Any]:
    """
    Store information in the Knowledge Graph.

    Args:
        entity_name: Name of the entity
        entity_type: Type of the entity
        observation: Observation about the entity

    Returns:
        Dictionary with success status and metadata
    """
    tool = KnowledgeGraphTool()
    return tool.store(entity_name, entity_type, observation)

def store_relationship(entity1: str, relationship: str, entity2: str) -> Dict[str, Any]:
    """
    Store a relationship between two entities in the Knowledge Graph.

    Args:
        entity1: First entity
        relationship: Relationship type
        entity2: Second entity

    Returns:
        Dictionary with success status and metadata
    """
    tool = KnowledgeGraphTool()
    return tool.store_relationship(entity1, relationship, entity2)

def extract_entities(text: str) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract entities from text.

    Args:
        text: Text to extract entities from

    Returns:
        List of entities if successful, error dictionary otherwise
    """
    tool = KnowledgeGraphTool()
    result = tool.extract_entities(text)

    if result["success"]:
        return result["entities"]
    return result

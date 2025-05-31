"""
Vector Search Tool for VANA Agent

This module provides a wrapper around the Vector Search client for the VANA agent.
It includes methods for searching and querying the Vector Search service with
appropriate error handling and result formatting.
"""

import logging
from typing import Dict, Any, Optional, List, Union
import json

# Import the Vector Search client
import sys
import os

# Add the project root to the path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

try:
    from tools.vector_search.vector_search_client import VectorSearchClient
except ImportError:
    # Fallback for testing or when tools module is not available
    class MockVectorSearchClient:
        def __init__(self, *args, **kwargs):
            pass
        def search(self, query, top_k=5):
            return [{"content": f"Mock result for: {query}", "score": 0.9, "metadata": {"source": "mock"}, "id": "mock_1"}]
        def search_knowledge(self, query, top_k=5):
            return [{"content": f"Mock knowledge for: {query}", "score": 0.9}]
        def get_health_status(self):
            return {"status": "healthy", "mock": True}
        def upload_embedding(self, content, metadata):
            return True
    VectorSearchClient = MockVectorSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorSearchTool:
    """
    Vector Search tool for the VANA agent.

    This tool provides a wrapper around the Vector Search client with
    appropriate error handling and result formatting for agent use.
    """

    def __init__(self, use_mock: bool = False, auto_fallback: bool = True):
        """
        Initialize the Vector Search tool.

        Args:
            use_mock: Whether to use the mock implementation
            auto_fallback: Whether to automatically fall back to the mock implementation if the real one fails
        """
        self.client = VectorSearchClient(use_mock=use_mock, auto_fallback=auto_fallback)
        self.use_mock = use_mock
        self.auto_fallback = auto_fallback
        logger.info(f"Initialized VectorSearchTool with use_mock={use_mock}, auto_fallback={auto_fallback}")

    def search(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Search for relevant content using Vector Search.

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Dictionary with 'success', 'results', and optional 'error' keys
        """
        try:
            # Validate input
            if not query or not isinstance(query, str):
                return {
                    "success": False,
                    "error": "Invalid query: must be a non-empty string"
                }

            if not isinstance(top_k, int) or top_k < 1:
                return {
                    "success": False,
                    "error": "Invalid top_k: must be a positive integer"
                }

            # Perform search
            results = self.client.search(query, top_k)

            # Check if results is a list (success) or dict (error)
            if isinstance(results, dict) and "error" in results:
                logger.error(f"Error searching Vector Search: {results['error']}")
                return {
                    "success": False,
                    "error": results["error"]
                }

            # Format results
            formatted_results = []
            for result in results:
                formatted_result = {
                    "content": result.get("content", ""),
                    "score": result.get("score", 0.0),
                    "source": result.get("metadata", {}).get("source", "unknown"),
                    "id": result.get("id", "")
                }
                formatted_results.append(formatted_result)

            logger.info(f"Successfully searched Vector Search for '{query}' with {len(formatted_results)} results")
            return {
                "success": True,
                "results": formatted_results
            }
        except Exception as e:
            logger.error(f"Error searching Vector Search: {str(e)}")
            return {
                "success": False,
                "error": f"Error searching Vector Search: {str(e)}"
            }

    def search_knowledge(self, query: str, top_k: int = 5) -> Dict[str, Any]:
        """
        Search for knowledge using Vector Search.

        Args:
            query: The search query
            top_k: Maximum number of results to return

        Returns:
            Dictionary with 'success', 'results', and optional 'error' keys
        """
        try:
            # Validate input
            if not query or not isinstance(query, str):
                return {
                    "success": False,
                    "error": "Invalid query: must be a non-empty string"
                }

            if not isinstance(top_k, int) or top_k < 1:
                return {
                    "success": False,
                    "error": "Invalid top_k: must be a positive integer"
                }

            # Perform search
            results = self.client.search_knowledge(query, top_k)

            # Check if results is a list (success) or dict (error)
            if isinstance(results, dict) and "error" in results:
                logger.error(f"Error searching knowledge: {results['error']}")
                return {
                    "success": False,
                    "error": results["error"]
                }

            logger.info(f"Successfully searched knowledge for '{query}' with {len(results)} results")
            return {
                "success": True,
                "results": results
            }
        except Exception as e:
            logger.error(f"Error searching knowledge: {str(e)}")
            return {
                "success": False,
                "error": f"Error searching knowledge: {str(e)}"
            }

    def get_health_status(self) -> Dict[str, Any]:
        """
        Get the health status of the Vector Search client.

        Returns:
            Dictionary with health status information
        """
        try:
            status = self.client.get_health_status()
            logger.info(f"Successfully got Vector Search health status: {status['status']}")
            return {
                "success": True,
                "status": status
            }
        except Exception as e:
            logger.error(f"Error getting Vector Search health status: {str(e)}")
            return {
                "success": False,
                "error": f"Error getting Vector Search health status: {str(e)}"
            }

    def upload_content(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Upload content to Vector Search.

        Args:
            content: The content to upload
            metadata: Optional metadata for the content

        Returns:
            Dictionary with 'success' and optional 'error' keys
        """
        try:
            # Validate input
            if not content or not isinstance(content, str):
                return {
                    "success": False,
                    "error": "Invalid content: must be a non-empty string"
                }

            if metadata is not None and not isinstance(metadata, dict):
                return {
                    "success": False,
                    "error": "Invalid metadata: must be a dictionary or None"
                }

            # Upload content
            result = self.client.upload_embedding(content, metadata or {})

            if not result:
                return {
                    "success": False,
                    "error": "Failed to upload content to Vector Search"
                }

            logger.info(f"Successfully uploaded content to Vector Search")
            return {
                "success": True
            }
        except Exception as e:
            logger.error(f"Error uploading content to Vector Search: {str(e)}")
            return {
                "success": False,
                "error": f"Error uploading content to Vector Search: {str(e)}"
            }

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the tool.

        Returns:
            Tool metadata
        """
        return {
            "name": "vector_search",
            "description": "Tool for searching and querying Vector Search",
            "operations": [
                {
                    "name": "search",
                    "description": "Search for relevant content using Vector Search",
                    "parameters": [
                        {
                            "name": "query",
                            "type": "string",
                            "description": "The search query",
                            "required": True
                        },
                        {
                            "name": "top_k",
                            "type": "integer",
                            "description": "Maximum number of results to return",
                            "required": False,
                            "default": 5
                        }
                    ]
                },
                {
                    "name": "search_knowledge",
                    "description": "Search for knowledge using Vector Search",
                    "parameters": [
                        {
                            "name": "query",
                            "type": "string",
                            "description": "The search query",
                            "required": True
                        },
                        {
                            "name": "top_k",
                            "type": "integer",
                            "description": "Maximum number of results to return",
                            "required": False,
                            "default": 5
                        }
                    ]
                },
                {
                    "name": "get_health_status",
                    "description": "Get the health status of the Vector Search client",
                    "parameters": []
                },
                {
                    "name": "upload_content",
                    "description": "Upload content to Vector Search",
                    "parameters": [
                        {
                            "name": "content",
                            "type": "string",
                            "description": "The content to upload",
                            "required": True
                        },
                        {
                            "name": "metadata",
                            "type": "object",
                            "description": "Optional metadata for the content",
                            "required": False
                        }
                    ]
                }
            ]
        }


# Function wrappers for the tool
def search(query: str, top_k: int = 5) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Search for relevant content using Vector Search.

    Args:
        query: The search query
        top_k: Maximum number of results to return

    Returns:
        List of search results if successful, error dictionary otherwise
    """
    tool = VectorSearchTool()
    result = tool.search(query, top_k)

    if result["success"]:
        return result["results"]
    return result

def search_knowledge(query: str, top_k: int = 5) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Search for knowledge using Vector Search.

    Args:
        query: The search query
        top_k: Maximum number of results to return

    Returns:
        List of knowledge results if successful, error dictionary otherwise
    """
    tool = VectorSearchTool()
    result = tool.search_knowledge(query, top_k)

    if result["success"]:
        return result["results"]
    return result

def get_health_status() -> Dict[str, Any]:
    """
    Get the health status of the Vector Search client.

    Returns:
        Health status information
    """
    tool = VectorSearchTool()
    result = tool.get_health_status()

    if result["success"]:
        return result["status"]
    return result

def upload_content(content: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Upload content to Vector Search.

    Args:
        content: The content to upload
        metadata: Optional metadata for the content

    Returns:
        Dictionary with 'success' and optional 'error' keys
    """
    tool = VectorSearchTool()
    return tool.upload_content(content, metadata)

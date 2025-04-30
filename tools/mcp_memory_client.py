import requests
import json
import logging
import os
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Import environment configuration
try:
    from config.environment import EnvironmentConfig
except ImportError:
    # Fallback if config module is not available
    class EnvironmentConfig:
        @staticmethod
        def get_mcp_config():
            return {
                "endpoint": os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
                "namespace": os.environ.get("MCP_NAMESPACE", "vana-project"),
                "api_key": os.environ.get("MCP_API_KEY", "")
            }

# Set up logging
logger = logging.getLogger(__name__)

class MCPMemoryClient:
    """Client for interacting with MCP Knowledge Graph Memory Server."""

    def __init__(self, endpoint: str = None, namespace: str = None, api_key: str = None):
        """
        Initialize the MCP Memory Client.

        Args:
            endpoint: MCP server endpoint (optional, defaults to environment configuration)
            namespace: MCP namespace (optional, defaults to environment configuration)
            api_key: MCP API key (optional, defaults to environment configuration)
        """
        # Get configuration from environment if not provided
        mcp_config = EnvironmentConfig.get_mcp_config()

        self.endpoint = endpoint or mcp_config["endpoint"]
        self.namespace = namespace or mcp_config["namespace"]
        api_key_to_use = api_key or mcp_config["api_key"]

        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key_to_use}"
        }
        self.last_sync_timestamp = None
        self.is_available = False
        self.last_connection_check = 0
        self.connection_check_interval = 60  # seconds

        # Verify connection on initialization
        self._verify_connection()

    def _verify_connection(self) -> bool:
        """
        Verify connection to MCP server.

        Returns:
            bool: True if connection is successful, False otherwise
        """
        current_time = time.time()

        # Skip check if we've checked recently
        if current_time - self.last_connection_check < self.connection_check_interval:
            return self.is_available

        try:
            url = f"{self.endpoint}/{self.namespace}/status"
            response = requests.get(url, headers=self.headers, timeout=10)

            if response.status_code == 200:
                self.is_available = True
                logger.info(f"Successfully connected to MCP server at {self.endpoint}")
            else:
                self.is_available = False
                logger.warning(f"MCP server returned status code {response.status_code}")

            self.last_connection_check = current_time
            return self.is_available

        except Exception as e:
            self.is_available = False
            logger.warning(f"Failed to connect to MCP server: {e}")
            self.last_connection_check = current_time
            return False

    def store_entity(self, entity_name: str, entity_type: str,
                     observations: List[str]) -> Dict[str, Any]:
        """
        Store a new entity in the knowledge graph.

        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            observations: List of observations about the entity

        Returns:
            Dict containing operation result
        """
        payload = {
            "operation": "store",
            "entityName": entity_name,
            "entityType": entity_type,
            "observations": observations
        }

        return self._make_request(payload)

    def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
        """
        Retrieve an entity from the knowledge graph.

        Args:
            entity_name: Name of the entity to retrieve

        Returns:
            Dict containing the entity data or error
        """
        payload = {
            "operation": "retrieve",
            "entityName": entity_name
        }

        return self._make_request(payload)

    def create_relationship(self, from_entity: str, relationship: str,
                          to_entity: str) -> Dict[str, Any]:
        """
        Create a relationship between entities.

        Args:
            from_entity: Source entity name
            relationship: Type of relationship
            to_entity: Target entity name

        Returns:
            Dict containing operation result
        """
        payload = {
            "operation": "relate",
            "fromEntity": from_entity,
            "relationship": relationship,
            "toEntity": to_entity
        }

        return self._make_request(payload)

    def get_initial_data(self) -> Dict[str, Any]:
        """
        Perform initial complete data load.

        Returns:
            Dict containing all entities or error
        """
        payload = {
            "operation": "retrieve_all"
        }

        result = self._make_request(payload)

        # Update last sync timestamp
        self.last_sync_timestamp = result.get("timestamp",
                            self._current_timestamp())

        return result

    def sync_delta(self) -> Dict[str, Any]:
        """
        Get changes since last sync.

        Returns:
            Dict containing added, modified, and deleted entities
        """
        if not self.last_sync_timestamp:
            # If no previous sync, perform initial load
            return self.get_initial_data()

        payload = {
            "operation": "sync",
            "lastSyncTimestamp": self.last_sync_timestamp
        }

        result = self._make_request(payload)

        # Update last sync timestamp
        if "currentTimestamp" in result:
            self.last_sync_timestamp = result["currentTimestamp"]

        return result

    def search_entities(self, query: str, entity_type: str = None,
                      limit: int = 10) -> Dict[str, Any]:
        """
        Search for entities in the knowledge graph.

        Args:
            query: Search query
            entity_type: Optional entity type to filter by
            limit: Maximum number of results to return

        Returns:
            Dict containing search results
        """
        payload = {
            "operation": "search",
            "query": query,
            "limit": limit
        }

        if entity_type:
            payload["entityType"] = entity_type

        return self._make_request(payload)

    def delete_entity(self, entity_name: str) -> Dict[str, Any]:
        """
        Delete an entity from the knowledge graph.

        Args:
            entity_name: Name of the entity to delete

        Returns:
            Dict containing operation result
        """
        payload = {
            "operation": "delete",
            "entityName": entity_name
        }

        return self._make_request(payload)

    def _current_timestamp(self) -> str:
        """Get current ISO format timestamp."""
        return datetime.now().isoformat()

    def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a request to the MCP server.

        Args:
            payload: Request payload

        Returns:
            Dict containing response or error
        """
        # Verify connection before making request
        if not self._verify_connection():
            return {"error": "MCP server is not available", "success": False}

        url = f"{self.endpoint}/{self.namespace}/memory"

        try:
            response = requests.post(url, headers=self.headers,
                                  json=payload, timeout=10)

            if response.status_code == 200:
                return response.json()
            else:
                error_msg = f"MCP server returned status code {response.status_code}"
                logger.error(f"{error_msg}: {response.text}")
                return {"error": error_msg, "success": False}

        except requests.exceptions.Timeout:
            error_msg = "Request to MCP server timed out"
            logger.error(error_msg)
            return {"error": error_msg, "success": False}

        except requests.exceptions.ConnectionError:
            error_msg = "Connection error when connecting to MCP server"
            logger.error(error_msg)
            self.is_available = False
            return {"error": error_msg, "success": False}

        except Exception as e:
            error_msg = f"Error making request to MCP server: {str(e)}"
            logger.error(error_msg)
            return {"error": error_msg, "success": False}

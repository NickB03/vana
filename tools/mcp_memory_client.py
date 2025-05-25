import requests
import json
import logging
import os
import time
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Import security components
from tools.security import CredentialManager
from tools.security import AuditLogger
from tools.security import AccessControlManager, Role, Operation, require_permission
from tools.resilience import circuit_breaker, CircuitBreakerOpenError

# Import environment configuration
try:
    # Try to import from the project structure
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
        # Initialize security components
        self.credential_manager = CredentialManager()
        self.access_control = AccessControlManager()
        self.audit_logger = AuditLogger()

        # Set role for access control
        self.role = Role.AGENT

        # Get secure credentials
        if not endpoint or not namespace or not api_key:
            mcp_credentials = self.credential_manager.get_mcp_credentials()

            self.endpoint = endpoint or mcp_credentials["endpoint"]
            self.namespace = namespace or mcp_credentials["namespace"]
            api_key_to_use = api_key or mcp_credentials["api_key"]
        else:
            self.endpoint = endpoint
            self.namespace = namespace
            api_key_to_use = api_key

        # Set up headers with secure credentials
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

    @circuit_breaker("mcp_store_entity", failure_threshold=3, reset_timeout=60.0)
    @require_permission(Operation.STORE_ENTITY, entity_type_arg="entity_type")
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
        try:
            # Create payload
            payload = {
                "operation": "store",
                "entityName": entity_name,
                "entityType": entity_type,
                "observations": observations
            }

            # Make the request
            result = self._make_request(payload)

            # Audit log the operation
            self.audit_logger.log_event(
                event_type="modification",
                user_id=f"agent:{self.role.value}",
                operation="store_entity",
                resource_type="entity",
                resource_id=result.get("entity", {}).get("id", "unknown"),
                details={
                    "entity_name": entity_name,
                    "entity_type": entity_type,
                    "observation_count": len(observations)
                },
                status="success" if result.get("success", False) else "failure"
            )

            return result
        except Exception as e:
            # Log the error
            logger.error(f"Error storing entity {entity_name}: {str(e)}")

            # Audit log the failure
            self.audit_logger.log_event(
                event_type="modification",
                user_id=f"agent:{self.role.value}",
                operation="store_entity",
                resource_type="entity",
                details={
                    "entity_name": entity_name,
                    "entity_type": entity_type,
                    "error": str(e)
                },
                status="error"
            )

            return {"error": str(e), "success": False}

    @circuit_breaker("mcp_retrieve_entity", failure_threshold=3, reset_timeout=60.0)
    @require_permission(Operation.RETRIEVE_ENTITY)
    def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
        """
        Retrieve an entity from the knowledge graph.

        Args:
            entity_name: Name of the entity to retrieve

        Returns:
            Dict containing the entity data or error
        """
        try:
            # Create payload
            payload = {
                "operation": "retrieve",
                "entityName": entity_name
            }

            # Make the request
            result = self._make_request(payload)

            # Audit log the operation
            self.audit_logger.log_event(
                event_type="access",
                user_id=f"agent:{self.role.value}",
                operation="retrieve_entity",
                resource_type="entity",
                resource_id=result.get("entity", {}).get("id", "unknown"),
                details={"entity_name": entity_name},
                status="success" if "entity" in result else "failure"
            )

            return result
        except Exception as e:
            # Log the error
            logger.error(f"Error retrieving entity {entity_name}: {str(e)}")

            # Audit log the failure
            self.audit_logger.log_event(
                event_type="access",
                user_id=f"agent:{self.role.value}",
                operation="retrieve_entity",
                resource_type="entity",
                details={
                    "entity_name": entity_name,
                    "error": str(e)
                },
                status="error"
            )

            return {"error": str(e), "success": False}

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

    @circuit_breaker("mcp_request", failure_threshold=5, reset_timeout=60.0)
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

        # Create a correlation ID for tracking this request
        correlation_id = f"mcp-{time.time()}-{hash(str(payload))}"

        # Log the request (excluding sensitive data)
        safe_payload = payload.copy()
        if "api_key" in safe_payload:
            safe_payload["api_key"] = "***"

        logger.debug(f"Making request to MCP server: {url} (correlation_id: {correlation_id})")

        try:
            # Make the request with timeout
            response = requests.post(url, headers=self.headers,
                                  json=payload, timeout=10)

            if response.status_code == 200:
                # Log success
                logger.debug(f"Request successful (correlation_id: {correlation_id})")
                return response.json()
            else:
                # Log error
                error_msg = f"MCP server returned status code {response.status_code}"
                logger.error(f"{error_msg}: {response.text} (correlation_id: {correlation_id})")

                # Record failure for circuit breaker
                raise Exception(error_msg)

        except requests.exceptions.Timeout:
            # Handle timeout
            error_msg = "Request to MCP server timed out"
            logger.error(f"{error_msg} (correlation_id: {correlation_id})")

            # Record failure for circuit breaker
            raise CircuitBreakerOpenError(error_msg)

        except requests.exceptions.ConnectionError as e:
            # Handle connection error
            error_msg = f"Connection error when connecting to MCP server: {str(e)}"
            logger.error(f"{error_msg} (correlation_id: {correlation_id})")
            self.is_available = False

            # Record failure for circuit breaker
            raise CircuitBreakerOpenError(error_msg)

        except CircuitBreakerOpenError:
            # Re-raise circuit breaker errors
            raise

        except Exception as e:
            # Handle other errors
            error_msg = f"Error making request to MCP server: {str(e)}"
            logger.error(f"{error_msg} (correlation_id: {correlation_id})")

            # Return error response
            return {"error": error_msg, "success": False}

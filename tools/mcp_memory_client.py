import requests
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class MCPMemoryClient:
    """Client for interacting with MCP Knowledge Graph Memory Server."""
    
    def __init__(self, endpoint: str, namespace: str, api_key: str):
        self.endpoint = endpoint
        self.namespace = namespace
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
        self.last_sync_timestamp = None
    
    def store_entity(self, entity_name: str, entity_type: str, 
                     observations: List[str]) -> Dict[str, Any]:
        """Store a new entity in the knowledge graph."""
        payload = {
            "operation": "store",
            "entityName": entity_name,
            "entityType": entity_type,
            "observations": observations
        }
        
        return self._make_request(payload)
    
    def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
        """Retrieve an entity from the knowledge graph."""
        payload = {
            "operation": "retrieve",
            "entityName": entity_name
        }
        
        return self._make_request(payload)
    
    def create_relationship(self, from_entity: str, relationship: str, 
                          to_entity: str) -> Dict[str, Any]:
        """Create a relationship between entities."""
        payload = {
            "operation": "relate",
            "fromEntity": from_entity,
            "relationship": relationship,
            "toEntity": to_entity
        }
        
        return self._make_request(payload)
    
    def get_initial_data(self) -> Dict[str, Any]:
        """Perform initial complete data load."""
        payload = {
            "operation": "retrieve_all"
        }
        
        result = self._make_request(payload)
        
        # Update last sync timestamp
        self.last_sync_timestamp = result.get("timestamp", 
                            self._current_timestamp())
        
        return result
    
    def sync_delta(self) -> Dict[str, Any]:
        """Get changes since last sync."""
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
    
    def _current_timestamp(self) -> str:
        """Get current ISO format timestamp."""
        return datetime.now().isoformat()
    
    def _make_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make a request to the MCP server."""
        url = f"{self.endpoint}/{self.namespace}/memory"
        
        try:
            response = requests.post(url, headers=self.headers, 
                                  json=payload, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error making request to MCP server: {e}")
            return {"error": str(e)}

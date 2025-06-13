import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MockMCPMemoryClient:
    """Mock client for testing MCP Memory integration."""

    def __init__(self, endpoint: str, namespace: str, api_key: str):
        self.endpoint = endpoint
        self.namespace = namespace
        self.api_key = api_key
        self.last_sync_timestamp = None
        self.entities = {}
        self.relationships = []
        logger.info(f"Initialized Mock MCP Memory Client with endpoint: {endpoint}")

    def store_entity(self, entity_name: str, entity_type: str, observations: List[str]) -> Dict[str, Any]:
        """Store a new entity in the mock knowledge graph."""
        entity_id = f"{entity_type.lower()}_{entity_name.lower().replace(' ', '_')}"

        self.entities[entity_id] = {
            "id": entity_id,
            "name": entity_name,
            "type": entity_type,
            "observations": observations,
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat(),
        }

        logger.info(f"Stored entity: {entity_name} (ID: {entity_id})")

        return {"success": True, "entityId": entity_id, "message": f"Entity {entity_name} stored successfully"}

    def retrieve_entity(self, entity_name: str) -> Dict[str, Any]:
        """Retrieve an entity from the mock knowledge graph."""
        # Search for entity by name
        for entity_id, entity in self.entities.items():
            if entity["name"].lower() == entity_name.lower():
                logger.info(f"Retrieved entity: {entity_name} (ID: {entity_id})")
                return {"success": True, "entity": entity}

        logger.info(f"Entity not found: {entity_name}")
        return {"success": False, "message": f"Entity {entity_name} not found"}

    def create_relationship(self, from_entity: str, relationship: str, to_entity: str) -> Dict[str, Any]:
        """Create a relationship between entities in the mock knowledge graph."""
        # Find entity IDs
        from_id = None
        to_id = None

        for entity_id, entity in self.entities.items():
            if entity["name"].lower() == from_entity.lower():
                from_id = entity_id
            if entity["name"].lower() == to_entity.lower():
                to_id = entity_id

        if not from_id or not to_id:
            logger.info(f"Relationship creation failed: entities not found")
            return {"success": False, "message": "One or both entities not found"}

        # Create relationship
        rel_id = f"{from_id}_{relationship}_{to_id}"
        self.relationships.append(
            {
                "id": rel_id,
                "fromEntity": from_id,
                "relationship": relationship,
                "toEntity": to_id,
                "createdAt": datetime.now().isoformat(),
            }
        )

        logger.info(f"Created relationship: {from_entity} {relationship} {to_entity}")

        return {"success": True, "relationshipId": rel_id, "message": f"Relationship created successfully"}

    def get_initial_data(self) -> Dict[str, Any]:
        """Perform initial complete data load from mock knowledge graph."""
        logger.info(f"Getting initial data with {len(self.entities)} entities")

        # Set last sync timestamp
        self.last_sync_timestamp = datetime.now().isoformat()

        return {
            "entities": list(self.entities.values()),
            "relationships": self.relationships,
            "timestamp": self.last_sync_timestamp,
        }

    def sync_delta(self) -> Dict[str, Any]:
        """Get changes since last sync from mock knowledge graph."""
        if not self.last_sync_timestamp:
            # If no previous sync, perform initial load
            return self.get_initial_data()

        # In a real implementation, this would filter entities based on timestamp
        # For the mock, we'll just return empty lists
        current_timestamp = datetime.now().isoformat()

        logger.info(f"Performing delta sync from {self.last_sync_timestamp} to {current_timestamp}")

        # Update last sync timestamp
        self.last_sync_timestamp = current_timestamp

        return {"added": [], "modified": [], "deleted": [], "currentTimestamp": current_timestamp}

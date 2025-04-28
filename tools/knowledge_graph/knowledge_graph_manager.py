"""
Knowledge Graph Manager for VANA Memory System

This module provides a client for interacting with the MCP Knowledge Graph.
It complements the Vector Search client to provide structured knowledge representation.
"""

import os
import requests
from typing import Dict, List, Any, Optional, Union

class KnowledgeGraphManager:
    """Client for interacting with MCP Knowledge Graph"""

    def __init__(self):
        """Initialize the Knowledge Graph manager"""
        self.api_key = os.environ.get("MCP_API_KEY")
        self.server_url = os.environ.get("MCP_SERVER_URL", "PLACEHOLDER_MCP_SERVER_URL")
        self.namespace = os.environ.get("MCP_NAMESPACE", "vana-project")

    def is_available(self) -> bool:
        """Check if Knowledge Graph is available"""
        if not self.api_key or not self.server_url:
            return False

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/ping",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Knowledge Graph is not available: {e}")
            return False

    def query(self, entity_type: str, query_text: str) -> Dict[str, Any]:
        """Query the Knowledge Graph for entities"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"entities": []}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/query",
                params={
                    "namespace": self.namespace,
                    "entity_type": entity_type,
                    "query": query_text
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error querying Knowledge Graph: {e}")
            return {"entities": []}

    def store(self, entity_name: str, entity_type: str, observation: str) -> Dict[str, Any]:
        """Store information in the Knowledge Graph"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.post(
                f"{self.server_url}/api/kg/store",
                json={
                    "namespace": self.namespace,
                    "entities": [{
                        "name": entity_name,
                        "type": entity_type,
                        "observation": observation
                    }]
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error storing in Knowledge Graph: {e}")
            return {"success": False}

    def get_context(self) -> Dict[str, Any]:
        """Get the current Knowledge Graph context"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"context": {}}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/context",
                params={"namespace": self.namespace},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error getting Knowledge Graph context: {e}")
            return {"context": {}}

    def query_related(self, entity_name: str, relationship_type: str) -> Dict[str, Any]:
        """Query for entities related to a specific entity"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"entities": []}

        try:
            response = requests.get(
                f"{self.server_url}/api/kg/related",
                params={
                    "namespace": self.namespace,
                    "entity": entity_name,
                    "relationship": relationship_type
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error querying related entities: {e}")
            return {"entities": []}

    def store_relationship(self, entity1: str, relationship: str, entity2: str) -> Dict[str, Any]:
        """Store a relationship between two entities"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.post(
                f"{self.server_url}/api/kg/relationship",
                json={
                    "namespace": self.namespace,
                    "entity1": entity1,
                    "relationship": relationship,
                    "entity2": entity2
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error storing relationship: {e}")
            return {"success": False}

    def delete(self, entity_name: str) -> Dict[str, Any]:
        """Delete an entity from the Knowledge Graph"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return {"success": False}

        try:
            response = requests.delete(
                f"{self.server_url}/api/kg/entity",
                params={
                    "namespace": self.namespace,
                    "entity": entity_name
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error deleting entity: {e}")
            return {"success": False}

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text"""
        if not self.is_available():
            print("Knowledge Graph is not available")
            return []

        try:
            response = requests.post(
                f"{self.server_url}/api/kg/extract",
                json={
                    "namespace": self.namespace,
                    "text": text
                },
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json().get("entities", [])
        except Exception as e:
            print(f"Error extracting entities: {e}")
            return []

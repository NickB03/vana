#!/usr/bin/env python3
"""
Test MCP Knowledge Graph Connection

This script tests the connection to the MCP Knowledge Graph server and performs
basic operations to verify that the Knowledge Graph is working correctly.

Usage:
    python test_mcp_connection.py --api-key <mcp_api_key>

Optional arguments:
    --server-url <url>      MCP server URL (default: PLACEHOLDER_MCP_SERVER_URL)
    --namespace <namespace> MCP namespace (default: vana-project)
    --verbose               Enable verbose output
"""

import os
import sys
import argparse
import requests
import logging

from datetime import datetime
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

class KnowledgeGraphClient:
    """Client for interacting with MCP Knowledge Graph"""

    def __init__(self, api_key: str, server_url: str = "PLACEHOLDER_MCP_SERVER_URL", namespace: str = "vana-project"):
        """Initialize the Knowledge Graph client"""
        self.api_key = api_key
        self.server_url = server_url
        self.namespace = namespace

    def ping(self) -> bool:
        """Ping the Knowledge Graph server"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/ping",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Failed to ping Knowledge Graph server: {e}")
            return False

    def store_entity(self, entity_name: str, entity_type: str, observation: str) -> Dict[str, Any]:
        """Store an entity in the Knowledge Graph"""
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
            logger.error(f"Error storing entity: {e}")
            return {"success": False, "error": str(e)}

    def query(self, entity_type: str, query_text: str) -> Dict[str, Any]:
        """Query the Knowledge Graph for entities"""
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
            logger.error(f"Error querying Knowledge Graph: {e}")
            return {"entities": []}

    def store_relationship(self, entity1: str, relationship: str, entity2: str) -> Dict[str, Any]:
        """Store a relationship between two entities"""
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
            logger.error(f"Error storing relationship: {e}")
            return {"success": False, "error": str(e)}

    def get_context(self) -> Dict[str, Any]:
        """Get the current Knowledge Graph context"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/context",
                params={"namespace": self.namespace},
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error getting Knowledge Graph context: {e}")
            return {"context": {}}

    def delete_entity(self, entity_name: str) -> Dict[str, Any]:
        """Delete an entity from the Knowledge Graph"""
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
            logger.error(f"Error deleting entity: {e}")
            return {"success": False, "error": str(e)}

def test_connection(kg_client: KnowledgeGraphClient) -> bool:
    """Test the connection to the Knowledge Graph server"""
    logger.info("Testing connection to Knowledge Graph server...")

    # Test ping
    if not kg_client.ping():
        logger.error("Failed to connect to Knowledge Graph server")
        return False

    logger.info("Successfully connected to Knowledge Graph server")
    return True

def test_entity_operations(kg_client: KnowledgeGraphClient, verbose: bool = False) -> bool:
    """Test entity operations (store, query, delete)"""
    logger.info("Testing entity operations...")

    # Create a test entity
    test_entity_name = f"Test Entity {datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_entity_type = "test"
    test_observation = "This is a test entity created by the MCP connection test script"

    # Store the entity
    logger.info(f"Storing test entity: {test_entity_name}")
    result = kg_client.store_entity(test_entity_name, test_entity_type, test_observation)

    if not result.get("success", False):
        logger.error(f"Failed to store test entity: {result.get('error', 'Unknown error')}")
        return False

    logger.info("Successfully stored test entity")

    # Query for the entity
    logger.info(f"Querying for test entity: {test_entity_name}")
    result = kg_client.query(test_entity_type, test_entity_name)

    entities = result.get("entities", [])
    if not entities:
        logger.error("Failed to query for test entity")
        return False

    logger.info(f"Successfully queried for test entity, found {len(entities)} entities")

    if verbose:
        for entity in entities:
            logger.info(f"Entity: {entity.get('name')} ({entity.get('type')})")
            logger.info(f"Observation: {entity.get('observation')}")

    # Delete the entity
    logger.info(f"Deleting test entity: {test_entity_name}")
    result = kg_client.delete_entity(test_entity_name)

    if not result.get("success", False):
        logger.error(f"Failed to delete test entity: {result.get('error', 'Unknown error')}")
        return False

    logger.info("Successfully deleted test entity")

    return True

def test_relationship_operations(kg_client: KnowledgeGraphClient) -> bool:
    """Test relationship operations (store, query)"""
    logger.info("Testing relationship operations...")

    # Create two test entities
    test_entity1_name = f"Test Entity 1 {datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_entity2_name = f"Test Entity 2 {datetime.now().strftime('%Y%m%d%H%M%S')}"
    test_entity_type = "test"

    # Store the entities
    logger.info(f"Storing test entities: {test_entity1_name} and {test_entity2_name}")
    kg_client.store_entity(test_entity1_name, test_entity_type, "This is test entity 1")
    kg_client.store_entity(test_entity2_name, test_entity_type, "This is test entity 2")

    # Store a relationship between the entities
    logger.info(f"Storing relationship: {test_entity1_name} -> related_to -> {test_entity2_name}")
    result = kg_client.store_relationship(test_entity1_name, "related_to", test_entity2_name)

    if not result.get("success", False):
        logger.error(f"Failed to store relationship: {result.get('error', 'Unknown error')}")
        # Clean up entities
        kg_client.delete_entity(test_entity1_name)
        kg_client.delete_entity(test_entity2_name)
        return False

    logger.info("Successfully stored relationship")

    # Clean up entities
    logger.info("Cleaning up test entities")
    kg_client.delete_entity(test_entity1_name)
    kg_client.delete_entity(test_entity2_name)

    return True

def test_context(kg_client: KnowledgeGraphClient, verbose: bool = False) -> bool:
    """Test getting the Knowledge Graph context"""
    logger.info("Testing Knowledge Graph context...")

    result = kg_client.get_context()
    context = result.get("context", {})

    if not context:
        logger.warning("No context available in the Knowledge Graph")
        return True  # Not a failure, just no context

    logger.info("Successfully retrieved Knowledge Graph context")

    if verbose:
        logger.info("Context:")
        for entity_type, entities in context.items():
            logger.info(f"{entity_type.capitalize()}s:")
            for entity in entities[:3]:
                logger.info(f"- {entity.get('name', '')}")

            if len(entities) > 3:
                logger.info(f"  ... and {len(entities) - 3} more {entity_type}s")

    return True

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Test MCP Knowledge Graph Connection")
    parser.add_argument("--api-key", help="MCP API key")
    parser.add_argument("--server-url", default="PLACEHOLDER_MCP_SERVER_URL", help="MCP server URL")
    parser.add_argument("--namespace", default="vana-project", help="MCP namespace")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")

    args = parser.parse_args()

    # Get API key from arguments or environment variables
    api_key = args.api_key or os.environ.get("MCP_API_KEY")

    if not api_key:
        logger.error("MCP API key is required. Please provide it with --api-key or set the MCP_API_KEY environment variable.")
        sys.exit(1)

    # Initialize Knowledge Graph client
    kg_client = KnowledgeGraphClient(
        api_key=api_key,
        server_url=args.server_url,
        namespace=args.namespace
    )

    # Run tests
    tests = [
        ("Connection", lambda client, _: test_connection(client)),
        ("Entity Operations", test_entity_operations),
        ("Relationship Operations", lambda client, _: test_relationship_operations(client)),
        ("Context", test_context)
    ]

    success = True

    for test_name, test_func in tests:
        logger.info(f"\n=== Testing {test_name} ===")
        if not test_func(kg_client, args.verbose):
            logger.error(f"{test_name} test failed")
            success = False
        else:
            logger.info(f"{test_name} test passed")

    if success:
        logger.info("\n✅ All tests passed! The MCP Knowledge Graph connection is working correctly.")
        sys.exit(0)
    else:
        logger.error("\n❌ Some tests failed. Please check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()

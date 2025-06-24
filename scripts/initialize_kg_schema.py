#!/usr/bin/env python3
"""
Initialize Knowledge Graph Schema

This script initializes the basic schema for the Knowledge Graph in the local MCP server.
"""

import os
import sys

import requests
from dotenv import load_dotenv

from lib.logging_config import get_logger

logger = get_logger("vana.initialize_kg_schema")


# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load environment variables
load_dotenv()


def initialize_kg_schema():
    """Initialize the Knowledge Graph schema with basic entity types and relationships."""
    # Use local MCP server for development
    endpoint = os.environ.get("MCP_ENDPOINT", "http://localhost:5000")
    namespace = os.environ.get("MCP_NAMESPACE", "vana-dev")
    api_key = os.environ.get("MCP_API_KEY", "local_dev_key")

    logger.info(f"Initializing Knowledge Graph schema at {endpoint}/{namespace}...")

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    # Define basic entity types
    entity_types = [
        "person",
        "project",
        "document",
        "concept",
        "task",
        "tool",
        "agent",
        "knowledge",
        "memory",
        "user",
    ]

    # Define basic relationship types
    relationship_types = [
        "related_to",
        "part_o",
        "created_by",
        "assigned_to",
        "depends_on",
        "has_property",
        "knows_about",
        "uses",
    ]

    # Initialize entity types
    for entity_type in entity_types:
        try:
            # Create a sample entity of this type to ensure the type exists
            payload = {
                "operation": "store",
                "entityName": f"Sample {entity_type.capitalize()}",
                "entityType": entity_type,
                "observations": [
                    f"This is a sample {entity_type} entity for schema initialization"
                ],
            }

            response = requests.post(
                f"{endpoint}/{namespace}/memory",
                headers=headers,
                json=payload,
                timeout=10,
            )

            if response.status_code == 200:
                logger.info(f"✅ Initialized entity type: {entity_type}")
            else:
                logger.error(
                    f"❌ Failed to initialize entity type {entity_type}: {response.text}"
                )
        except Exception as e:
            logger.error(f"❌ Error initializing entity type {entity_type}: {e}")

    # Create relationships between sample entities
    try:
        # Get the first two entities to create a relationship
        payload = {"operation": "retrieve_all"}

        response = requests.post(
            f"{endpoint}/{namespace}/memory", headers=headers, json=payload, timeout=10
        )

        if response.status_code == 200:
            entities = response.json().get("entities", [])

            if len(entities) >= 2:
                # Create a sample relationship
                payload = {
                    "operation": "create_relationship",
                    "fromEntity": entities[0]["name"],
                    "relationship": "related_to",
                    "toEntity": entities[1]["name"],
                }

                response = requests.post(
                    f"{endpoint}/{namespace}/memory",
                    headers=headers,
                    json=payload,
                    timeout=10,
                )

                if response.status_code == 200:
                    logger.info("✅ Initialized relationship: related_to")
                else:
                    logger.error(
                        f"❌ Failed to initialize relationship: {response.text}"
                    )
            else:
                logger.info("⚠️ Not enough entities to create a relationship")
        else:
            logger.error(f"❌ Failed to retrieve entities: {response.text}")
    except Exception as e:
        logger.error(f"❌ Error initializing relationships: {e}")

    logger.info("Knowledge Graph schema initialization complete!")


if __name__ == "__main__":
    initialize_kg_schema()

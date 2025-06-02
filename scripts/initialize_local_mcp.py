#!/usr/bin/env python3
"""
Initialize Local MCP Server

This script initializes the local MCP server with basic entity types and relationships.
"""

import os
import sys

import requests
from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Load environment variables
load_dotenv()


def initialize_local_mcp():
    """Initialize the local MCP server."""
    # Use local MCP server
    endpoint = "http://localhost:5000"
    namespace = "vana-dev"
    api_key = "local_dev_key"

    print(f"Initializing local MCP server at {endpoint}/{namespace}...")

    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    # Check if server is running
    try:
        response = requests.get(
            f"{endpoint}/{namespace}/status", headers=headers, timeout=10
        )

        if response.status_code != 200:
            print(
                f"❌ Local MCP server is not running or returned status code {response.status_code}"
            )
            print(f"Response: {response.text}")
            print(
                "Make sure the local MCP server is running with 'docker-compose up -d mcp-kg-server'"
            )
            return False
    except Exception as e:
        print(f"❌ Error connecting to local MCP server: {e}")
        print(
            "Make sure the local MCP server is running with 'docker-compose up -d mcp-kg-server'"
        )
        return False

    print("✅ Local MCP server is running")

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
        "part_of",
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
                print(f"✅ Initialized entity type: {entity_type}")
            else:
                print(
                    f"❌ Failed to initialize entity type {entity_type}: {response.text}"
                )
        except Exception as e:
            print(f"❌ Error initializing entity type {entity_type}: {e}")

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
                    print("✅ Initialized relationship: related_to")
                else:
                    print(f"❌ Failed to initialize relationship: {response.text}")
            else:
                print("⚠️ Not enough entities to create a relationship")
        else:
            print(f"❌ Failed to retrieve entities: {response.text}")
    except Exception as e:
        print(f"❌ Error initializing relationships: {e}")

    print("Local MCP server initialization complete!")
    return True


if __name__ == "__main__":
    initialize_local_mcp()

#!/usr/bin/env python3
"""
Import Claude Chat History to MCP Knowledge Graph

This script parses Claude chat history from a JSON file, extracts entities and relationships,
and stores them in the MCP Knowledge Graph for use with the VANA memory system.

Usage:
    python import_claude_history.py --input <path_to_chat_history.json> --api-key <mcp_api_key>

Optional arguments:
    --server-url <url>      MCP server URL (default: PLACEHOLDER_MCP_SERVER_URL)
    --namespace <namespace> MCP namespace (default: vana-project)
    --verbose               Enable verbose output
    --dry-run               Run without storing data in the Knowledge Graph
"""

import os
import sys
import json
import argparse
import requests
import logging
import re
from datetime import datetime
from typing import Dict, List, Any
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

    def is_available(self) -> bool:
        """Check if Knowledge Graph is available"""
        try:
            response = requests.get(
                f"{self.server_url}/api/kg/ping",
                headers={"Authorization": f"Bearer {self.api_key}"}
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(f"Knowledge Graph is not available: {e}")
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

    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text using the Knowledge Graph API"""
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
            logger.error(f"Error extracting entities: {e}")
            return []

class ClaudeHistoryImporter:
    """Import Claude chat history to MCP Knowledge Graph"""

    def __init__(self, kg_client: KnowledgeGraphClient, verbose: bool = False, dry_run: bool = False):
        """Initialize the importer"""
        self.kg_client = kg_client
        self.verbose = verbose
        self.dry_run = dry_run
        self.conversation_count = 0
        self.entity_count = 0
        self.relationship_count = 0

        # Patterns for entity extraction
        self.project_pattern = re.compile(r'project\s+([A-Za-z0-9_-]+)', re.IGNORECASE)
        self.technology_pattern = re.compile(r'(Python|JavaScript|TypeScript|React|Node\.js|Docker|Kubernetes|GCP|AWS|Azure|Vector Search|Knowledge Graph|ADK|n8n|MCP)', re.IGNORECASE)
        self.agent_pattern = re.compile(r'(Ben|Rhea|Max|Sage|Kai|Juno)', re.IGNORECASE)

    def load_chat_history(self, file_path: str) -> List[Dict[str, Any]]:
        """Load chat history from a JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Handle different JSON formats
            if isinstance(data, list):
                # Format: [{"conversation": {...}}, ...]
                return data
            elif isinstance(data, dict) and "conversations" in data:
                # Format: {"conversations": [...]}
                return data["conversations"]
            elif isinstance(data, dict) and "history" in data:
                # Format: {"history": [...]}
                return data["history"]
            else:
                logger.error(f"Unsupported JSON format in {file_path}")
                return []
        except Exception as e:
            logger.error(f"Error loading chat history: {e}")
            return []

    def extract_entities_from_message(self, message: str) -> List[Dict[str, Any]]:
        """Extract entities from a message"""
        # Use the Knowledge Graph API to extract entities
        api_entities = self.kg_client.extract_entities(message)

        if api_entities:
            return api_entities

        # Fallback to pattern-based extraction if API fails
        entities = []

        # Extract projects
        for match in self.project_pattern.finditer(message):
            project_name = match.group(1)
            entities.append({
                "name": project_name,
                "type": "project",
                "observation": message
            })

        # Extract technologies
        for match in self.technology_pattern.finditer(message):
            tech_name = match.group(1)
            entities.append({
                "name": tech_name,
                "type": "technology",
                "observation": message
            })

        # Extract agents
        for match in self.agent_pattern.finditer(message):
            agent_name = match.group(1)
            entities.append({
                "name": agent_name,
                "type": "agent",
                "observation": message
            })

        # Simple entity extraction based on capitalized words
        words = message.split()
        for i, word in enumerate(words):
            if word and word[0].isupper() and len(word) > 1 and word.lower() not in ["i", "i'm", "i'll", "i've", "i'd"]:
                # Check if it's part of a multi-word entity
                entity_name = word
                j = i + 1
                while j < len(words) and words[j][0].isupper() and len(words[j]) > 1:
                    entity_name += " " + words[j]
                    j += 1

                # Skip if already extracted
                if any(e["name"] == entity_name for e in entities):
                    continue

                # Determine entity type based on context
                entity_type = "concept"
                if "project" in message.lower() and entity_name.lower() in message.lower():
                    entity_type = "project"
                elif "tool" in message.lower() and entity_name.lower() in message.lower():
                    entity_type = "tool"
                elif "agent" in message.lower() and entity_name.lower() in message.lower():
                    entity_type = "agent"

                entities.append({
                    "name": entity_name,
                    "type": entity_type,
                    "observation": message
                })

        return entities

    def extract_relationships(self, entities: List[Dict[str, Any]], message: str) -> List[Dict[str, Any]]:
        """Extract relationships between entities"""
        relationships = []

        # Group entities by type
        projects = [e for e in entities if e["type"] == "project"]
        technologies = [e for e in entities if e["type"] == "technology"]
        agents = [e for e in entities if e["type"] == "agent"]
        concepts = [e for e in entities if e["type"] == "concept"]

        # Create relationships between projects and technologies
        for project in projects:
            for tech in technologies:
                # Check if they appear close to each other in the message
                if project["name"].lower() in message.lower() and tech["name"].lower() in message.lower():
                    # Determine relationship type based on context
                    relationship = "uses"
                    if "contains" in message.lower():
                        relationship = "contains"
                    elif "requires" in message.lower():
                        relationship = "requires"

                    relationships.append({
                        "entity1": project["name"],
                        "relationship": relationship,
                        "entity2": tech["name"]
                    })

        # Create relationships between agents and concepts
        for agent in agents:
            for concept in concepts:
                if agent["name"].lower() in message.lower() and concept["name"].lower() in message.lower():
                    relationships.append({
                        "entity1": agent["name"],
                        "relationship": "knows_about",
                        "entity2": concept["name"]
                    })

        return relationships

    def process_conversation(self, conversation: Dict[str, Any]) -> None:
        """Process a single conversation"""
        # Extract conversation metadata
        conversation_id = conversation.get("id", f"conversation_{self.conversation_count}")
        title = conversation.get("title", "Untitled Conversation")
        timestamp = conversation.get("created_at", datetime.now().isoformat())

        logger.info(f"Processing conversation: {title} ({conversation_id})")

        # Store conversation as an entity
        if not self.dry_run:
            self.kg_client.store_entity(
                entity_name=title,
                entity_type="conversation",
                observation=f"Claude conversation from {timestamp}"
            )
            self.entity_count += 1

        # Process messages
        messages = conversation.get("messages", [])
        if not messages and "mapping" in conversation:
            # Handle Claude export format
            mapping = conversation.get("mapping", {})
            messages = [msg for _, msg in mapping.items() if msg.get("message")]

        for message in messages:
            # Extract message content
            if isinstance(message, dict):
                content = message.get("content", "")
                if not content and "message" in message:
                    content = message["message"].get("content", {}).get("text", "")
            else:
                content = str(message)

            if not content:
                continue

            if self.verbose:
                logger.info(f"Processing message: {content[:50]}...")

            # Extract entities
            entities = self.extract_entities_from_message(content)

            # Store entities
            for entity in entities:
                if self.verbose:
                    logger.info(f"Found entity: {entity['name']} ({entity['type']})")

                if not self.dry_run:
                    self.kg_client.store_entity(
                        entity_name=entity["name"],
                        entity_type=entity["type"],
                        observation=entity["observation"]
                    )

                    # Link entity to conversation
                    self.kg_client.store_relationship(
                        entity1=title,
                        relationship="contains",
                        entity2=entity["name"]
                    )

                    self.entity_count += 1

            # Extract and store relationships
            relationships = self.extract_relationships(entities, content)

            for relationship in relationships:
                if self.verbose:
                    logger.info(f"Found relationship: {relationship['entity1']} {relationship['relationship']} {relationship['entity2']}")

                if not self.dry_run:
                    self.kg_client.store_relationship(
                        entity1=relationship["entity1"],
                        relationship=relationship["relationship"],
                        entity2=relationship["entity2"]
                    )

                    self.relationship_count += 1

        self.conversation_count += 1

    def import_history(self, file_path: str) -> None:
        """Import chat history from a file"""
        logger.info(f"Importing chat history from {file_path}")

        # Check if Knowledge Graph is available
        if not self.kg_client.is_available():
            logger.error("Knowledge Graph is not available. Please check your API key and server URL.")
            return

        # Load chat history
        conversations = self.load_chat_history(file_path)

        if not conversations:
            logger.error(f"No conversations found in {file_path}")
            return

        logger.info(f"Found {len(conversations)} conversations")

        # Process each conversation
        for conversation in conversations:
            self.process_conversation(conversation)

        logger.info(f"Import completed: {self.conversation_count} conversations, {self.entity_count} entities, {self.relationship_count} relationships")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Import Claude chat history to MCP Knowledge Graph")
    parser.add_argument("--input", required=True, help="Path to the chat history JSON file")
    parser.add_argument("--api-key", help="MCP API key")
    parser.add_argument("--server-url", default="PLACEHOLDER_MCP_SERVER_URL", help="MCP server URL")
    parser.add_argument("--namespace", default="vana-project", help="MCP namespace")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("--dry-run", action="store_true", help="Run without storing data in the Knowledge Graph")

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

    # Initialize importer
    importer = ClaudeHistoryImporter(
        kg_client=kg_client,
        verbose=args.verbose,
        dry_run=args.dry_run
    )

    # Import chat history
    importer.import_history(args.input)

if __name__ == "__main__":
    main()

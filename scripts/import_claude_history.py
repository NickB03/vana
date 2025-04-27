#!/usr/bin/env python3
"""
Import Claude Chat History to MCP Knowledge Graph

This script imports chat history from Claude into the MCP Knowledge Graph.
It processes the chat history, extracts entities and relationships,
and stores them in the knowledge graph.

Usage:
    python import_claude_history.py --input <claude_history_file> --server <mcp_server_url>
"""

import argparse
import json
import os
import sys
import requests
from datetime import datetime
import logging
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('claude-history-import')

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Import Claude chat history to MCP Knowledge Graph')
    parser.add_argument('--input', type=str, required=True, help='Path to Claude chat history file')
    parser.add_argument('--server', type=str, default='https://mcp.community.augment.co', 
                        help='MCP server URL')
    parser.add_argument('--namespace', type=str, default='vana-project', 
                        help='Namespace for the knowledge graph')
    parser.add_argument('--api-key', type=str, help='API key for the MCP server')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    
    return parser.parse_args()

def load_chat_history(file_path):
    """Load chat history from file."""
    logger.info(f"Loading chat history from {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            if file_path.endswith('.json'):
                return json.load(f)
            else:
                # Assume it's a text file with a custom format
                # This is a placeholder - you'll need to implement the actual parsing logic
                return parse_text_chat_history(f.read())
    except Exception as e:
        logger.error(f"Error loading chat history: {e}")
        sys.exit(1)

def parse_text_chat_history(text):
    """Parse chat history from text format."""
    # This is a placeholder - you'll need to implement the actual parsing logic
    # based on the format of your Claude chat history
    
    conversations = []
    current_conversation = {"messages": []}
    
    # Simple regex-based parsing (adjust based on your actual format)
    message_pattern = re.compile(r'(Human|Assistant): (.*?)(?=Human:|Assistant:|$)', re.DOTALL)
    
    for match in message_pattern.finditer(text):
        role, content = match.groups()
        current_conversation["messages"].append({
            "role": role.lower(),
            "content": content.strip()
        })
    
    if current_conversation["messages"]:
        current_conversation["id"] = f"conv_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        current_conversation["timestamp"] = datetime.now().isoformat()
        conversations.append(current_conversation)
    
    return conversations

def extract_entities(conversation):
    """Extract entities from conversation."""
    entities = []
    
    # Extract project entities
    project_pattern = re.compile(r'project\s+([A-Za-z0-9_-]+)', re.IGNORECASE)
    technology_pattern = re.compile(r'(Python|JavaScript|TypeScript|React|Node\.js|Docker|Kubernetes|GCP|AWS|Azure)', re.IGNORECASE)
    
    for message in conversation["messages"]:
        content = message["content"]
        
        # Extract projects
        for match in project_pattern.finditer(content):
            project_name = match.group(1)
            entities.append({
                "name": project_name,
                "type": "project",
                "source": conversation["id"],
                "timestamp": conversation["timestamp"]
            })
        
        # Extract technologies
        for match in technology_pattern.finditer(content):
            tech_name = match.group(1)
            entities.append({
                "name": tech_name,
                "type": "technology",
                "source": conversation["id"],
                "timestamp": conversation["timestamp"]
            })
    
    return entities

def extract_relationships(conversation, entities):
    """Extract relationships between entities."""
    relationships = []
    
    # This is a simplified approach - in a real implementation,
    # you would use more sophisticated NLP techniques
    
    # Group entities by type
    projects = [e for e in entities if e["type"] == "project"]
    technologies = [e for e in entities if e["type"] == "technology"]
    
    # Create relationships between projects and technologies
    for project in projects:
        for tech in technologies:
            # Check if they appear in the same message
            for message in conversation["messages"]:
                if project["name"] in message["content"] and tech["name"] in message["content"]:
                    relationships.append({
                        "source": project["name"],
                        "target": tech["name"],
                        "type": "uses",
                        "conversation": conversation["id"],
                        "timestamp": conversation["timestamp"]
                    })
    
    return relationships

def store_in_knowledge_graph(entities, relationships, args):
    """Store entities and relationships in the MCP Knowledge Graph."""
    logger.info(f"Storing {len(entities)} entities and {len(relationships)} relationships in the knowledge graph")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    # Store entities
    for entity in entities:
        try:
            response = requests.post(
                f"{args.server}/api/entities",
                json={
                    "namespace": args.namespace,
                    "name": entity["name"],
                    "type": entity["type"],
                    "metadata": {
                        "source": entity["source"],
                        "timestamp": entity["timestamp"]
                    }
                },
                headers=headers
            )
            
            if response.status_code not in (200, 201):
                logger.warning(f"Failed to store entity {entity['name']}: {response.text}")
        except Exception as e:
            logger.error(f"Error storing entity {entity['name']}: {e}")
    
    # Store relationships
    for rel in relationships:
        try:
            response = requests.post(
                f"{args.server}/api/relationships",
                json={
                    "namespace": args.namespace,
                    "source": rel["source"],
                    "target": rel["target"],
                    "type": rel["type"],
                    "metadata": {
                        "conversation": rel["conversation"],
                        "timestamp": rel["timestamp"]
                    }
                },
                headers=headers
            )
            
            if response.status_code not in (200, 201):
                logger.warning(f"Failed to store relationship: {response.text}")
        except Exception as e:
            logger.error(f"Error storing relationship: {e}")

def store_conversations(conversations, args):
    """Store entire conversations in the knowledge graph."""
    logger.info(f"Storing {len(conversations)} conversations in the knowledge graph")
    
    headers = {
        "Content-Type": "application/json"
    }
    
    if args.api_key:
        headers["Authorization"] = f"Bearer {args.api_key}"
    
    for conversation in conversations:
        try:
            # Create a conversation entity
            response = requests.post(
                f"{args.server}/api/entities",
                json={
                    "namespace": args.namespace,
                    "name": conversation["id"],
                    "type": "conversation",
                    "metadata": {
                        "timestamp": conversation["timestamp"],
                        "message_count": len(conversation["messages"])
                    }
                },
                headers=headers
            )
            
            if response.status_code not in (200, 201):
                logger.warning(f"Failed to store conversation {conversation['id']}: {response.text}")
                continue
            
            # Store each message as an observation
            for i, message in enumerate(conversation["messages"]):
                response = requests.post(
                    f"{args.server}/api/observations",
                    json={
                        "namespace": args.namespace,
                        "entity": conversation["id"],
                        "property": "message",
                        "value": {
                            "index": i,
                            "role": message["role"],
                            "content": message["content"]
                        },
                        "timestamp": conversation["timestamp"]
                    },
                    headers=headers
                )
                
                if response.status_code not in (200, 201):
                    logger.warning(f"Failed to store message {i} for conversation {conversation['id']}: {response.text}")
        
        except Exception as e:
            logger.error(f"Error storing conversation {conversation['id']}: {e}")

def main():
    """Main function."""
    args = parse_arguments()
    
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    # Load chat history
    conversations = load_chat_history(args.input)
    logger.info(f"Loaded {len(conversations)} conversations")
    
    # Process each conversation
    all_entities = []
    all_relationships = []
    
    for conversation in conversations:
        # Extract entities and relationships
        entities = extract_entities(conversation)
        relationships = extract_relationships(conversation, entities)
        
        all_entities.extend(entities)
        all_relationships.extend(relationships)
    
    # Store in knowledge graph
    store_in_knowledge_graph(all_entities, all_relationships, args)
    
    # Store conversations
    store_conversations(conversations, args)
    
    logger.info("Import completed successfully")

if __name__ == "__main__":
    main()

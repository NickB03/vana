#!/usr/bin/env python
"""
Knowledge Graph Demo Script

This script demonstrates the basic operations of the Knowledge Graph component
of the VANA system. It shows how to store entities, create relationships,
and query the Knowledge Graph.

Usage:
    python examples/knowledge_graph_demo.py
"""

import os
import sys
import json
import time
from dotenv import load_dotenv

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

# Import Knowledge Graph tools
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

def print_header(title):
    """Print a section header"""
    print("\n" + "=" * 60)
    print(f" {title} ".center(60, "="))
    print("=" * 60 + "\n")

def print_success(message):
    """Print a success message"""
    print(f"✅ {message}")

def print_info(message):
    """Print an info message"""
    print(f"ℹ️ {message}")

def print_error(message):
    """Print an error message"""
    print(f"❌ {message}")

def wait_for_user():
    """Wait for user to press Enter"""
    input("\nPress Enter to continue...\n")

def main():
    """Main demo function"""
    print_header("VANA Knowledge Graph Demo")
    
    # Initialize Knowledge Graph manager
    print_info("Initializing Knowledge Graph Manager...")
    kg_manager = KnowledgeGraphManager()
    
    # Check if Knowledge Graph is available
    if not kg_manager.is_available():
        print_error("Knowledge Graph is not available. Please check your configuration.")
        return
    
    print_success("Knowledge Graph is available")
    wait_for_user()
    
    # Step 1: Store entities
    print_header("Step 1: Storing Entities")
    
    entities = [
        {"name": "VANA", "type": "project", "observation": "VANA is a Versatile Agent Network Architecture using Google's ADK for agent-based knowledge systems."},
        {"name": "Vector Search", "type": "technology", "observation": "Vector Search is a semantic search technology that finds similar content based on meaning rather than exact keyword matches."},
        {"name": "Knowledge Graph", "type": "technology", "observation": "Knowledge Graph is a structured representation of knowledge using entities and relationships."},
        {"name": "Hybrid Search", "type": "concept", "observation": "Hybrid Search combines vector-based semantic search with structured knowledge graph queries for comprehensive results."},
        {"name": "Google ADK", "type": "technology", "observation": "Google's Agent Development Kit (ADK) provides a framework for building autonomous agents with structured behavior."}
    ]
    
    print_info("Storing the following entities:")
    for entity in entities:
        print(f"  - {entity['name']} ({entity['type']})")
    
    for entity in entities:
        try:
            kg_manager.store(entity["name"], entity["type"], entity["observation"])
            print_success(f"Stored entity: {entity['name']} ({entity['type']})")
        except Exception as e:
            print_error(f"Failed to store entity {entity['name']}: {str(e)}")
    
    wait_for_user()
    
    # Step 2: Query entities
    print_header("Step 2: Querying Entities")
    
    queries = [
        {"type": "*", "query": "VANA"},
        {"type": "technology", "query": "*"},
        {"type": "concept", "query": "Search"}
    ]
    
    for query in queries:
        print_info(f"Querying for {query['type']} entities matching '{query['query']}':")
        
        try:
            results = kg_manager.query(query["type"], query["query"])
            entities = results.get("entities", [])
            
            if not entities:
                print_info(f"No results found for {query['type']} entities matching '{query['query']}'")
                continue
            
            print_success(f"Found {len(entities)} entities:")
            for i, entity in enumerate(entities, 1):
                name = entity.get("name", "Unknown entity")
                entity_type = entity.get("type", "Unknown type")
                observation = entity.get("observation", "")
                
                # Truncate long observation
                if len(observation) > 100:
                    observation = observation[:97] + "..."
                
                print(f"  {i}. {name} ({entity_type})")
                print(f"     {observation}")
        except Exception as e:
            print_error(f"Query failed: {str(e)}")
    
    wait_for_user()
    
    # Step 3: Create relationships
    print_header("Step 3: Creating Relationships")
    
    relationships = [
        {"from": "VANA", "relation": "uses", "to": "Vector Search"},
        {"from": "VANA", "relation": "uses", "to": "Knowledge Graph"},
        {"from": "VANA", "relation": "implements", "to": "Hybrid Search"},
        {"from": "VANA", "relation": "built_with", "to": "Google ADK"},
        {"from": "Hybrid Search", "relation": "combines", "to": "Vector Search"},
        {"from": "Hybrid Search", "relation": "combines", "to": "Knowledge Graph"}
    ]
    
    print_info("Creating the following relationships:")
    for rel in relationships:
        print(f"  - {rel['from']} [{rel['relation']}] {rel['to']}")
    
    for rel in relationships:
        try:
            kg_manager.create_relation(rel["from"], rel["relation"], rel["to"])
            print_success(f"Created relationship: {rel['from']} [{rel['relation']}] {rel['to']}")
        except Exception as e:
            print_error(f"Failed to create relationship: {str(e)}")
    
    wait_for_user()
    
    # Step 4: Query relationships
    print_header("Step 4: Querying Relationships")
    
    entity_name = "VANA"
    print_info(f"Querying relationships for entity: {entity_name}")
    
    try:
        # Get relationships where entity is the source
        outgoing = kg_manager.get_relations(entity_name, direction="outgoing")
        print_success(f"Outgoing relationships from {entity_name}:")
        
        if not outgoing:
            print_info("No outgoing relationships found")
        else:
            for rel in outgoing:
                print(f"  - {entity_name} [{rel['relation']}] {rel['to']}")
        
        # Get relationships where entity is the target
        incoming = kg_manager.get_relations(entity_name, direction="incoming")
        print_success(f"Incoming relationships to {entity_name}:")
        
        if not incoming:
            print_info("No incoming relationships found")
        else:
            for rel in incoming:
                print(f"  - {rel['from']} [{rel['relation']}] {entity_name}")
    except Exception as e:
        print_error(f"Failed to query relationships: {str(e)}")
    
    wait_for_user()
    
    # Step 5: Demonstrate entity expansion
    print_header("Step 5: Entity Expansion")
    
    entity_name = "VANA"
    depth = 2
    print_info(f"Expanding entity '{entity_name}' to depth {depth}")
    
    try:
        expansion = kg_manager.expand_entity(entity_name, depth)
        
        print_success(f"Entity expansion for '{entity_name}':")
        
        for level, level_data in enumerate(expansion, 1):
            print(f"\nLevel {level}:")
            
            if not level_data:
                print_info("No relationships at this level")
                continue
                
            for rel in level_data:
                print(f"  - {rel['from']} [{rel['relation']}] {rel['to']}")
    except Exception as e:
        print_error(f"Failed to expand entity: {str(e)}")
    
    wait_for_user()
    
    # Step 6: Clean up (optional)
    print_header("Step 6: Cleanup (Optional)")
    
    print_info("Would you like to remove the demo entities and relationships? (y/n)")
    response = input("> ").strip().lower()
    
    if response == "y":
        print_info("Removing demo entities and relationships...")
        
        # Remove entities (will also remove related relationships)
        for entity in entities:
            try:
                kg_manager.delete_entity(entity["name"])
                print_success(f"Removed entity: {entity['name']}")
            except Exception as e:
                print_error(f"Failed to remove entity {entity['name']}: {str(e)}")
        
        print_success("Cleanup complete!")
    else:
        print_info("Entities and relationships will be kept in the Knowledge Graph")
    
    print_header("Demo Complete")
    print_info("This demo has shown the basic operations of the Knowledge Graph component:")
    print("  1. Storing entities")
    print("  2. Querying entities")
    print("  3. Creating relationships")
    print("  4. Querying relationships")
    print("  5. Entity expansion")
    print("  6. Cleanup (optional)")
    print("\nThese operations can be used in your VANA agent to build and query a rich knowledge graph.")

if __name__ == "__main__":
    main()

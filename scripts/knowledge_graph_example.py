#!/usr/bin/env python3
"""
Knowledge Graph Example Script

This script demonstrates basic Knowledge Graph operations using the KnowledgeGraphManager.
It shows how to store entities, relationships, and query the Knowledge Graph.

Usage:
    python scripts/knowledge_graph_example.py
"""

import os
import sys
from dotenv import load_dotenv
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from lib.logging_config import get_logger
logger = get_logger("vana.knowledge_graph_example")


# Load environment variables
load_dotenv()

def main():
    """Run Knowledge Graph example"""
    logger.info("=== Knowledge Graph Example ===\n")
    
    # Check if MCP API key is set
    if not os.environ.get("MCP_API_KEY"):
        logger.error("Error: MCP_API_KEY environment variable is not set")
        logger.info("Please set it in your .env file or export it in your shell")
        return False
    
    # Initialize Knowledge Graph manager
    kg_manager = KnowledgeGraphManager()
    
    # Check if Knowledge Graph is available
    if not kg_manager.is_available():
        logger.error("Error: Knowledge Graph is not available")
        logger.info("Please check your MCP_API_KEY and internet connection")
        return False
    
    logger.info("Knowledge Graph is available\n")
    
    # Store entities
    logger.info("Storing entities...")
    
    # Store VANA entity
    vana_result = kg_manager.store(
        "VANA",
        "project",
        "VANA (Versatile Agent Network Architecture) is an intelligent agent system built using Google's ADK."
    )
    logger.info("%s", f"Stored VANA entity: {vana_result.get('success', False)}")
    
    # Store Vector Search entity
    vs_result = kg_manager.store(
        "Vector Search",
        "technology",
        "Vector Search is a semantic search capability provided by Vertex AI."
    )
    logger.info("%s", f"Stored Vector Search entity: {vs_result.get('success', False)}")
    
    # Store Knowledge Graph entity
    kg_result = kg_manager.store(
        "Knowledge Graph",
        "technology",
        "Knowledge Graph provides structured knowledge representation with entities and relationships."
    )
    logger.info("%s", f"Stored Knowledge Graph entity: {kg_result.get('success', False)}")
    
    # Store relationships
    logger.info("\nStoring relationships...")
    
    # VANA uses Vector Search
    rel1_result = kg_manager.store_relationship(
        "VANA",
        "uses",
        "Vector Search"
    )
    logger.info("%s", f"Stored 'VANA uses Vector Search' relationship: {rel1_result.get('success', False)}")
    
    # VANA uses Knowledge Graph
    rel2_result = kg_manager.store_relationship(
        "VANA",
        "uses",
        "Knowledge Graph"
    )
    logger.info("%s", f"Stored 'VANA uses Knowledge Graph' relationship: {rel2_result.get('success', False)}")
    
    # Query entities
    logger.info("\nQuerying entities...")
    
    # Query VANA
    vana_query = kg_manager.query("project", "VANA")
    logger.info("%s", f"Query for 'project VANA':")
    if vana_query.get("entities"):
        for entity in vana_query.get("entities", []):
            logger.info("%s", f"  - {entity.get('name')}: {entity.get('observation')}")
    else:
        logger.info("  No results found")
    
    # Query technologies
    tech_query = kg_manager.query("technology", "*")
    logger.info("%s", f"\nQuery for 'technology *':")
    if tech_query.get("entities"):
        for entity in tech_query.get("entities", []):
            logger.info("%s", f"  - {entity.get('name')}: {entity.get('observation')}")
    else:
        logger.info("  No results found")
    
    # Query relationships
    logger.info("\nQuerying relationships...")
    
    # What does VANA use?
    rel_query = kg_manager.query_relationships("VANA", "uses", "*")
    logger.info("%s", f"Query for 'VANA uses *':")
    if rel_query.get("relationships"):
        for rel in rel_query.get("relationships", []):
            logger.info("%s", f"  - {rel.get('entity1')} {rel.get('relationship')} {rel.get('entity2')}")
    else:
        logger.info("  No results found")
    
    logger.info("\nKnowledge Graph example completed successfully!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

"""
Test script for Knowledge Graph integration

This script tests the Knowledge Graph manager for the VANA memory system.
"""

import os
import sys
import time
from dotenv import load_dotenv
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager

# Load environment variables
load_dotenv()

def test_knowledge_graph():
    """Test Knowledge Graph integration"""
    print("Testing Knowledge Graph integration...")
    
    # Check if Knowledge Graph environment variables are set
    required_vars = [
        "MCP_API_KEY",
        "MCP_SERVER_URL",
        "MCP_NAMESPACE"
    ]
    
    missing_vars = [var for var in required_vars if not os.environ.get(var)]
    if missing_vars:
        print(f"Error: Missing environment variables: {', '.join(missing_vars)}")
        print("Please set all required environment variables")
        return False
    
    # Initialize Knowledge Graph manager
    kg_manager = KnowledgeGraphManager()
    
    # Test if Knowledge Graph is available
    print("Checking if Knowledge Graph is available...")
    if not kg_manager.is_available():
        print("Error: Knowledge Graph is not available")
        print("Please check your API key and server URL")
        return False
    
    print("Knowledge Graph is available!")
    
    # Test storing an entity
    print("\nTesting entity storage...")
    test_entity_name = f"Test Entity {time.strftime('%Y%m%d%H%M%S')}"
    test_entity_type = "test"
    test_observation = "This is a test entity for the Knowledge Graph integration test."
    
    store_result = kg_manager.store(test_entity_name, test_entity_type, test_observation)
    
    if not store_result.get("success", False):
        print("Error: Failed to store entity")
        return False
    
    print(f"Successfully stored entity: {test_entity_name}")
    
    # Test querying for entities
    print("\nTesting entity query...")
    query_result = kg_manager.query("test", "test entity")
    
    entities = query_result.get("entities", [])
    if not entities:
        print("Warning: No entities found")
    else:
        print(f"Found {len(entities)} entities")
        
        for i, entity in enumerate(entities[:3], 1):
            name = entity.get("name", "")
            entity_type = entity.get("type", "")
            observation = entity.get("observation", "")
            
            print(f"{i}. {name} ({entity_type})")
            print(f"   {observation}")
    
    # Test getting context
    print("\nTesting context retrieval...")
    context_result = kg_manager.get_context()
    
    context = context_result.get("context", {})
    if not context:
        print("Warning: No context available")
    else:
        print("Current Knowledge Graph context:")
        
        for entity_type, entities in context.items():
            print(f"{entity_type.capitalize()}s:")
            for entity in entities[:3]:
                print(f"- {entity.get('name', '')}")
            
            if len(entities) > 3:
                print(f"  ... and {len(entities) - 3} more {entity_type}s")
    
    # Test storing a relationship
    print("\nTesting relationship storage...")
    test_entity2_name = f"Test Entity 2 {time.strftime('%Y%m%d%H%M%S')}"
    test_entity2_type = "test"
    test_entity2_observation = "This is another test entity for the relationship test."
    
    # Store the second entity
    kg_manager.store(test_entity2_name, test_entity2_type, test_entity2_observation)
    
    # Store the relationship
    relationship_result = kg_manager.store_relationship(test_entity_name, "related_to", test_entity2_name)
    
    if not relationship_result.get("success", False):
        print("Error: Failed to store relationship")
    else:
        print(f"Successfully stored relationship: {test_entity_name} related_to {test_entity2_name}")
    
    # Test querying related entities
    print("\nTesting related entity query...")
    related_result = kg_manager.query_related(test_entity_name, "*")
    
    related_entities = related_result.get("entities", [])
    if not related_entities:
        print("Warning: No related entities found")
    else:
        print(f"Found {len(related_entities)} related entities")
        
        for i, entity in enumerate(related_entities, 1):
            name = entity.get("name", "")
            entity_type = entity.get("type", "")
            relationship = entity.get("relationship", "")
            
            print(f"{i}. {name} ({entity_type}) - {relationship}")
    
    # Test entity extraction
    print("\nTesting entity extraction...")
    test_text = "VANA is a multi-agent system using Google's ADK and Vertex AI Vector Search for memory management."
    
    extracted_entities = kg_manager.extract_entities(test_text)
    
    if not extracted_entities:
        print("Warning: No entities extracted")
    else:
        print(f"Extracted {len(extracted_entities)} entities")
        
        for i, entity in enumerate(extracted_entities, 1):
            name = entity.get("name", "")
            entity_type = entity.get("type", "")
            
            print(f"{i}. {name} ({entity_type})")
    
    # Clean up test entities
    print("\nCleaning up test entities...")
    kg_manager.delete(test_entity_name)
    kg_manager.delete(test_entity2_name)
    
    print("\nAll Knowledge Graph tests completed successfully!")
    return True

if __name__ == "__main__":
    success = test_knowledge_graph()
    sys.exit(0 if success else 1)

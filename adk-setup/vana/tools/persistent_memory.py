"""
Persistent Memory Integration for VANA

This module integrates the persistent memory system with the VANA agent.
It provides tools for storing and retrieving knowledge from the MCP Knowledge Graph Memory Server.
"""

import os
import logging
import sys
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Import the memory components
from tools.mcp_memory_client import MCPMemoryClient
from tools.memory_manager import MemoryManager
from tools.hybrid_search_delta import HybridSearchDelta
from tools.entity_scorer import EntityScorer

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class PersistentMemory:
    """Persistent Memory Integration for VANA"""
    
    def __init__(self):
        """Initialize the persistent memory integration"""
        # Initialize MCP Memory Client
        self.mcp_client = MCPMemoryClient(
            endpoint=os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
            namespace=os.environ.get("MCP_NAMESPACE", "vana-project"),
            api_key=os.environ.get("MCP_API_KEY", "")
        )
        
        # Initialize Memory Manager
        self.memory_manager = MemoryManager(self.mcp_client)
        self.memory_manager.initialize()
        
        # Initialize Entity Scorer
        self.entity_scorer = EntityScorer()
        
        # Initialize Hybrid Search
        self.hybrid_search = HybridSearchDelta(self.memory_manager)
        
        logger.info("Persistent Memory Integration initialized")
    
    async def search_memory(self, query: str, top_k: int = 5) -> str:
        """
        Search the persistent memory for relevant information
        
        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)
            
        Returns:
            Formatted string with search results
        """
        try:
            logger.info(f"Searching persistent memory for: {query}")
            
            # Perform hybrid search
            results = await self.hybrid_search.search(query, top_k=top_k)
            
            # Format results
            formatted = self.hybrid_search.format_results(results)
            
            return formatted
        except Exception as e:
            logger.error(f"Error searching persistent memory: {e}")
            return f"Error searching persistent memory: {str(e)}"
    
    def store_entity(self, entity_name: str, entity_type: str, observations: List[str]) -> str:
        """
        Store an entity in the persistent memory
        
        Args:
            entity_name: Name of the entity
            entity_type: Type of the entity
            observations: List of observations about the entity
            
        Returns:
            Status message
        """
        try:
            logger.info(f"Storing entity in persistent memory: {entity_name} ({entity_type})")
            
            # Store entity
            result = self.mcp_client.store_entity(entity_name, entity_type, observations)
            
            # Sync memory manager
            self.memory_manager.sync()
            
            if result.get("success"):
                return f"Entity {entity_name} stored successfully"
            else:
                return f"Error storing entity: {result.get('message', 'Unknown error')}"
        except Exception as e:
            logger.error(f"Error storing entity in persistent memory: {e}")
            return f"Error storing entity in persistent memory: {str(e)}"
    
    def create_relationship(self, from_entity: str, relationship: str, to_entity: str) -> str:
        """
        Create a relationship between entities in the persistent memory
        
        Args:
            from_entity: Name of the source entity
            relationship: Type of relationship
            to_entity: Name of the target entity
            
        Returns:
            Status message
        """
        try:
            logger.info(f"Creating relationship in persistent memory: {from_entity} {relationship} {to_entity}")
            
            # Create relationship
            result = self.mcp_client.create_relationship(from_entity, relationship, to_entity)
            
            # Sync memory manager
            self.memory_manager.sync()
            
            if result.get("success"):
                return f"Relationship created successfully"
            else:
                return f"Error creating relationship: {result.get('message', 'Unknown error')}"
        except Exception as e:
            logger.error(f"Error creating relationship in persistent memory: {e}")
            return f"Error creating relationship in persistent memory: {str(e)}"
    
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract entities from text
        
        Args:
            text: Text to extract entities from
            
        Returns:
            List of extracted entities
        """
        # This is a placeholder implementation
        # In a real implementation, this would use NLP to extract entities
        
        # For now, just return some basic entities based on keywords
        entities = []
        
        # Check for project-related keywords
        if "vana" in text.lower() or "project" in text.lower():
            entities.append({
                "name": "Project VANA",
                "type": "Project",
                "observations": ["VANA is a versatile agent network architecture"]
            })
        
        # Check for vector search keywords
        if "vector" in text.lower() or "search" in text.lower():
            entities.append({
                "name": "Vector Search",
                "type": "Technology",
                "observations": ["Vector Search is a semantic search technology used in VANA"]
            })
        
        # Check for knowledge graph keywords
        if "knowledge" in text.lower() or "graph" in text.lower():
            entities.append({
                "name": "Knowledge Graph",
                "type": "Technology",
                "observations": ["Knowledge Graph is a structured knowledge representation used in VANA"]
            })
        
        return entities
    
    def process_conversation(self, user_message: str, assistant_response: str) -> str:
        """
        Process a conversation turn and extract entities
        
        Args:
            user_message: User's message
            assistant_response: Assistant's response
            
        Returns:
            Status message
        """
        try:
            logger.info("Processing conversation for entity extraction")
            
            # Extract entities from user message
            user_entities = self.extract_entities(user_message)
            
            # Extract entities from assistant response
            assistant_entities = self.extract_entities(assistant_response)
            
            # Combine entities
            all_entities = user_entities + assistant_entities
            
            # Store entities
            for entity in all_entities:
                self.store_entity(
                    entity_name=entity["name"],
                    entity_type=entity["type"],
                    observations=entity["observations"]
                )
            
            return f"Processed conversation and extracted {len(all_entities)} entities"
        except Exception as e:
            logger.error(f"Error processing conversation: {e}")
            return f"Error processing conversation: {str(e)}"

# Create a singleton instance
persistent_memory = PersistentMemory()

# Function to get the persistent memory instance
def get_persistent_memory() -> PersistentMemory:
    """Get the persistent memory instance"""
    return persistent_memory

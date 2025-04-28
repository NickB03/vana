"""
Vana Agent Definition

This module defines the Vana agent, a primary agent interface that 
leverages Google ADK and external tools via MCP for knowledge management.
"""

import os
import logging
import functools
from typing import List, Dict, Any, Optional
from google.generativeai.adk import base_agent
from google.generativeai.adk import agent as agent_lib
from google.generativeai.adk import tool as tool_lib
from tools.hybrid_search import HybridSearch
from tools.knowledge_graph.knowledge_graph_manager import KnowledgeGraphManager
from tools.vector_search.vector_search_client import VectorSearchClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize tools
hybrid_search = HybridSearch()
kg_manager = KnowledgeGraphManager()
vector_search_client = VectorSearchClient()

class VanaAgent(agent_lib.LlmAgent):
    """
    VANA Agent - Primary interface leveraging knowledge tools via MCP
    """
    
    name = "vana"
    model = "gemini-1.5-pro"
    
    system_prompt = """
    You are VANA (Versatile Agent Network Architecture), an intelligent agent built to assist users
    with information retrieval and knowledge management. You have access to specialized tools that
    allow you to search through knowledge bases and structured data.
    
    When answering questions:
    1. Use your built-in knowledge first for general information
    2. For domain-specific or project information, use your knowledge tools
    3. Combine information from multiple sources to provide comprehensive answers
    4. Always cite your sources when using external knowledge
    5. Be conversational and helpful, explaining concepts clearly
    
    You have the following capabilities:
    - Search Vector Search for semantic knowledge retrieval
    - Query Knowledge Graph for structured entity and relationship information
    - Use Hybrid Search to combine both approaches for comprehensive answers
    
    When you need to access specific information about projects, technologies, or concepts,
    use the appropriate knowledge tool.
    """
    
    @tool_lib.tool("search_knowledge")
    def search_knowledge(self, query: str, top_k: int = 5) -> str:
        """
        Search for information in the knowledge base.
        
        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)
            
        Returns:
            Formatted string with search results
        """
        try:
            logger.info(f"Searching knowledge for: {query}")
            results = vector_search_client.search(query, top_k=top_k)
            
            if not results:
                return "No relevant information found."
            
            formatted = "Relevant information:\n\n"
            for i, result in enumerate(results, 1):
                content = result.get("content", "")
                score = result.get("score", 0)
                source = result.get("metadata", {}).get("source", "Unknown source")
                
                # Truncate long content
                if len(content) > 200:
                    content = content[:197] + "..."
                
                formatted += f"{i}. (Score: {score:.2f}) From: {source}\n"
                formatted += f"{content}\n\n"
            
            return formatted
        except Exception as e:
            logger.error(f"Error in search_knowledge: {str(e)}")
            return f"Error searching knowledge: {str(e)}"

    @tool_lib.tool("kg_query")
    def kg_query(self, entity_type: str, query: str) -> str:
        """
        Query the Knowledge Graph for entities of a specific type.
        
        Args:
            entity_type: Type of entity to search for (e.g., "project", "technology", "person")
                         Use "*" for all entity types
            query: The search query
            
        Returns:
            Formatted string with Knowledge Graph results
        """
        try:
            logger.info(f"Querying Knowledge Graph for: {entity_type} - {query}")
            results = kg_manager.query(entity_type, query)
            entities = results.get("entities", [])
            
            if not entities:
                return f"No entities found matching '{query}' with type '{entity_type}'."
            
            formatted = f"Found {len(entities)} entities matching '{query}':\n\n"
            for i, entity in enumerate(entities, 1):
                name = entity.get("name", "Unknown entity")
                entity_type = entity.get("type", "Unknown type")
                observation = entity.get("observation", "")
                
                # Truncate long observation
                if len(observation) > 200:
                    observation = observation[:197] + "..."
                
                formatted += f"{i}. {name} ({entity_type})\n"
                formatted += f"   {observation}\n\n"
            
            return formatted
        except Exception as e:
            logger.error(f"Error in kg_query: {str(e)}")
            return f"Error querying Knowledge Graph: {str(e)}"

    @tool_lib.tool("hybrid_search")
    def hybrid_search_tool(self, query: str, top_k: int = 5) -> str:
        """
        Search using both Vector Search and Knowledge Graph for comprehensive results.
        
        Args:
            query: The search query
            top_k: Maximum number of results to return (default: 5)
            
        Returns:
            Formatted string with hybrid search results
        """
        try:
            logger.info(f"Performing hybrid search for: {query}")
            return hybrid_search.search_and_format(query, top_k=top_k)
        except Exception as e:
            logger.error(f"Error in hybrid_search: {str(e)}")
            return f"Error in hybrid search: {str(e)}"

    @tool_lib.tool("kg_store")
    def kg_store(self, entity_name: str, entity_type: str, observation: str) -> str:
        """
        Store an entity with an observation in the Knowledge Graph.
        
        Args:
            entity_name: Name of the entity (e.g., "VANA", "Vector Search")
            entity_type: Type of entity (e.g., "project", "technology", "concept")
            observation: The information or description to store about the entity
            
        Returns:
            Confirmation message
        """
        try:
            logger.info(f"Storing entity in Knowledge Graph: {entity_name} ({entity_type})")
            kg_manager.store(entity_name, entity_type, observation)
            return f"Entity '{entity_name}' stored in Knowledge Graph with type '{entity_type}'."
        except Exception as e:
            logger.error(f"Error in kg_store: {str(e)}")
            return f"Error storing entity: {str(e)}"

def create_vana_agent() -> VanaAgent:
    """Create and configure a Vana agent"""
    try:
        logger.info("Creating Vana agent")
        agent = VanaAgent()
        logger.info("Vana agent created successfully")
        return agent
    except Exception as e:
        logger.error(f"Error creating Vana agent: {str(e)}")
        raise
